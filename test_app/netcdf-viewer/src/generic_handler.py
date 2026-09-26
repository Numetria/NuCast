from __future__ import annotations
import numpy as np
import xarray as xr
import threading
from collections import OrderedDict
from pathlib import Path

_LAT_UNITS = {"degreesnorth", "degreenorth", "degreesn", "degreen"}
_LON_UNITS = {"degreeseast", "degreeeast", "degreese", "degreee"}
_PRESSURE_UNITS = {"pa", "hpa", "kpa", "mbar", "millibar", "millibars", "mb", "bar"}
_LAT_NAMES = {"lat", "latitude", "lats", "nav_lat", "xlat", "glat"}
_LON_NAMES = {"lon", "longitude", "lons", "long", "nav_lon", "xlong", "xlon", "glon"}
_TIME_NAMES = {"time", "t", "times", "valid_time", "xtime"}
_VERTICAL_NAMES = {"plev", "lev", "level", "levels", "isobaric", "pressure",
                    "height", "depth", "altitude", "z", "nisolevels"}
_VERTICAL_STANDARD_NAMES = {"air_pressure", "altitude", "height", "depth",
                             "model_level_number", "geopotential_height"}
_NOT_GEOGRAPHIC = {"grid_latitude", "grid_longitude",
                    "projection_x_coordinate", "projection_y_coordinate"}

def _norm_units(var) -> str:
    return str(var.attrs.get("units", "")).lower().replace("_", "").replace(" ", "")

def _evidence(var, name: str, axis: str) -> int:
    std = str(var.attrs.get("standard_name", "")).lower()
    if std in _NOT_GEOGRAPHIC:
        return 0
    units = _norm_units(var)
    want = {"lat": ("latitude", _LAT_UNITS, "Y", "lat", _LAT_NAMES),
            "lon": ("longitude", _LON_UNITS, "X", "lon", _LON_NAMES)}[axis]
    std_name, unit_set, cf_axis, cat, names = want
    score = 0
    if std == std_name:
        score += 8
    if units in unit_set:
        score += 4
    if str(var.attrs.get("_CoordinateAxisType", "")).lower() == cat:
        score += 4
    if str(var.attrs.get("axis", "")).upper() == cf_axis and units in (
            "", "degrees", "degree", *unit_set):
        score += 2
    if name.lower() in names:
        score += 1
    return score

def _find_axis(ds, axis: str, where: str = "") -> tuple[str, str]:
    scored = sorted(((_evidence(v, str(n), axis), str(n)) for n, v in ds.variables.items()),
                    reverse=True)
    best = [(sc, n) for sc, n in scored if sc > 0]
    if not best:
        raise ValueError(f"no {axis} coordinate found{where}.")
    top = best[0][0]
    leaders = [n for sc, n in best if sc == top]
    one_d = [n for n in leaders if ds[n].ndim == 1]
    if not one_d:
        n = leaders[0]
        raise ValueError(f"{n!r} is the {axis} coordinate{where} but is 2D (curvilinear).")
    name = next((n for n in one_d if ds[n].dims == (n,)), one_d[0])
    dim = str(ds[name].dims[0])
    values = np.asarray(ds[name].values, dtype=np.float64)
    step = np.diff(values)
    if values.size > 1 and not (np.all(step > 0) or np.all(step < 0)):
        raise ValueError(f"{name!r} is not monotonic{where}.")
    return name, dim

def _is_time(ds, dim: str) -> bool:
    if dim not in ds.variables:
        return dim.lower() in _TIME_NAMES
    var = ds[dim]
    return (np.issubdtype(var.dtype, np.datetime64)
            or var.dtype == object and dim.lower() in _TIME_NAMES
            or str(var.attrs.get("standard_name", "")).lower() == "time"
            or str(var.attrs.get("axis", "")).upper() == "T"
            or str(var.attrs.get("_CoordinateAxisType", "")).lower() == "time"
            or " since " in str(var.attrs.get("units", ""))
            or dim.lower() in _TIME_NAMES)

def _is_vertical(ds, dim: str) -> bool:
    if dim not in ds.variables:
        return dim.lower() in _VERTICAL_NAMES
    var = ds[dim]
    return (str(var.attrs.get("positive", "")).lower() in ("up", "down")
            or str(var.attrs.get("axis", "")).upper() == "Z"
            or str(var.attrs.get("_CoordinateAxisType", "")).lower()
            in ("pressure", "height", "geopotentialheight")
            or str(var.attrs.get("standard_name", "")).lower() in _VERTICAL_STANDARD_NAMES
            or _norm_units(var) in _PRESSURE_UNITS
            or dim.lower() in _VERTICAL_NAMES)

class GenericNetCDFHandler:
    def __init__(self, filepath: str):
        self.filepath = Path(filepath)
        self.ds = xr.open_dataset(self.filepath, decode_timedelta=False, engine="netcdf4")
        self.lat_name = self.lon_name = self.lat_dim = self.lon_dim = ""
        self.time_name = None
        self._vertical = set()
        self._build_grid()

    def _build_grid(self):
        where = f" in {self.filepath.name}"
        self.lat_name, self.lat_dim = _find_axis(self.ds, "lat", where)
        self.lon_name, self.lon_dim = _find_axis(self.ds, "lon", where)
        
        dims = {str(d) for da in self.ds.data_vars.values() for d in da.dims}
        dims -= {self.lat_dim, self.lon_dim}
        
        self.time_name = next((d for d in sorted(dims) if _is_time(self.ds, d)), None)
        self._vertical = {d for d in dims if _is_vertical(self.ds, d)}
        self._vertical -= {self.time_name}

    def describe(self) -> dict:
        variables = []
        for name, da in self.ds.data_vars.items():
            spatial = self.lat_dim in da.dims and self.lon_dim in da.dims
            stack = [str(d) for d in da.dims if d not in (self.lat_dim, self.lon_dim, self.time_name)]
            
            # Auto-plot introspection (xarray-style)
            ndim = da.ndim
            if spatial:
                suggested = "map" if ndim == 2 else "map" # Default to map for spatial
            elif ndim == 1:
                suggested = "line"
            elif ndim == 2:
                suggested = "heatmap"
            else:
                suggested = "auto"

            variables.append({
                "name": name,
                "label": str(da.attrs.get("long_name", da.attrs.get("standard_name", name))),
                "units": str(da.attrs.get("units", "")),
                "spatial": spatial,
                "levels": int(da.sizes[stack[0]]) if spatial and stack else 1,
                "dim": stack[0] if spatial and stack else "",
                "suggested_plot": suggested,
                "kinds": ["map", "line", "hist"] if spatial else ["line", "hist"],
            })
        
        time_size = int(self.ds[self.time_name].size) if self.time_name and self.time_name in self.ds.sizes else 1
        vertical_sizes = {d: int(self.ds[d].size) for d in self._vertical if d in self.ds.sizes}
        return {
            "file": self.filepath.name,
            "nx": int(self.ds[self.lon_name].size),
            "ny": int(self.ds[self.lat_name].size),
            "time_axis": self.time_name,
            "time_size": time_size,
            "vertical_axes": list(self._vertical),
            "vertical_sizes": vertical_sizes,
            "variables": variables,
        }

    def get_variable_data(self, var_name: str, time_idx=0, level_idx=0):
        if var_name not in self.ds:
            raise KeyError(f"Variable {var_name} not found")
        
        da = self.ds[var_name]
        
        # Slicing
        slices = {}
        if self.time_name and self.time_name in da.dims:
            slices[self.time_name] = time_idx
        
        stack = [str(d) for d in da.dims if d not in (self.lat_dim, self.lon_dim, self.time_name)]
        if stack:
            slices[stack[0]] = level_idx
            
        data_slice = da.isel(slices)
        
        def _jsonable(values):
            arr = np.asarray(values)
            if np.issubdtype(arr.dtype, np.datetime64):
                return arr.astype("datetime64[s]").astype(str).tolist()
            if arr.dtype == object:
                return [str(v) for v in arr]
            return arr.tolist()
        
        attrs = {}
        for k, v in data_slice.attrs.items():
            if isinstance(v, (np.integer,)):
                attrs[k] = int(v)
            elif isinstance(v, (np.floating,)):
                attrs[k] = float(v)
            elif isinstance(v, np.ndarray):
                attrs[k] = _jsonable(v)
            elif isinstance(v, (str, int, float, bool)) or v is None:
                attrs[k] = v
            else:
                attrs[k] = str(v)
        
        # Return data along with its coordinates for plotting (xarray style)
        return {
            "values": _jsonable(data_slice.values),
            "coords": {
                "lat": _jsonable(self.ds[self.lat_name].values) if self.lat_dim in data_slice.dims else [],
                "lon": _jsonable(self.ds[self.lon_name].values) if self.lon_dim in data_slice.dims else [],
                "time": _jsonable(self.ds[self.time_name].values) if self.time_name and self.time_name in data_slice.dims else [],
                "level": _jsonable(self.ds[stack[0]].values) if stack and stack[0] in data_slice.dims else []
            },
            "attrs": attrs
        }

    def close(self):
        self.ds.close()
