# app.py
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import netCDF4 as nc
import numpy as np
import os
import tempfile
import uuid
import json

app = Flask(__name__)
CORS(app)  # Enable Cross-Origin Resource Sharing

# Directory to store uploaded files temporarily
UPLOAD_FOLDER = tempfile.gettempdir()
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

@app.route('/api/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    if file:
        # Save the file with a unique name
        filename = str(uuid.uuid4()) + '_' + file.filename
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        try:
            # Read the NetCDF file
            result = read_netcdf_info(filepath)
            
            # Return the metadata to the client
            return jsonify({
                'success': True,
                'filename': filename,
                'info': result
            })
        
        except Exception as e:
            # Remove the file if there was an error
            if os.path.exists(filepath):
                os.remove(filepath)
            return jsonify({'error': str(e)}), 500

@app.route('/api/variable', methods=['GET'])
def get_variable():
    filename = request.args.get('filename')
    variable = request.args.get('variable')
    
    if not filename or not variable:
        return jsonify({'error': 'Missing filename or variable parameter'}), 400
    
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    
    if not os.path.exists(filepath):
        return jsonify({'error': 'File not found'}), 404
    
    try:
        # Get the variable data
        result = get_variable_data(filepath, variable)
        
        # Return the data to the client
        return jsonify({
            'success': True,
            'variable': variable,
            'data': result
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def read_netcdf_info(filepath):
    """
    Read information from a NetCDF file.
    
    Parameters:
    -----------
    filepath : str
        Path to the NetCDF file
        
    Returns:
    --------
    dict
        Dictionary containing information about dimensions, variables, and global attributes
    """
    with nc.Dataset(filepath, 'r') as ncfile:
        # Get dimensions
        dimensions = []
        for name, dimension in ncfile.dimensions.items():
            dimensions.append({
                'name': name,
                'size': len(dimension)
            })
        
        # Get variables
        variables = []
        for name, variable in ncfile.variables.items():
            attributes = {}
            for attr_name in variable.ncattrs():
                attr_value = variable.getncattr(attr_name)
                # Convert numpy types to native Python types for JSON serialization
                if isinstance(attr_value, np.ndarray):
                    attr_value = attr_value.tolist()
                elif isinstance(attr_value, (np.integer, np.floating)):
                    attr_value = attr_value.item()
                attributes[attr_name] = attr_value
            
            variables.append({
                'name': name,
                'dimensions': variable.dimensions,
                'type': str(variable.dtype),
                'size': variable.size,
                'attributes': attributes
            })
        
        # Get global attributes
        global_attributes = {}
        for attr_name in ncfile.ncattrs():
            attr_value = ncfile.getncattr(attr_name)
            # Convert numpy types to native Python types for JSON serialization
            if isinstance(attr_value, np.ndarray):
                attr_value = attr_value.tolist()
            elif isinstance(attr_value, (np.integer, np.floating)):
                attr_value = attr_value.item()
            global_attributes[attr_name] = attr_value
        
        return {
            'dimensions': dimensions,
            'variables': variables,
            'globalAttributes': global_attributes
        }

def get_variable_data(filepath, variable_name):
    """
    Get data for a specific variable from a NetCDF file.
    
    Parameters:
    -----------
    filepath : str
        Path to the NetCDF file
    variable_name : str
        Name of the variable to get data for
        
    Returns:
    --------
    dict
        Dictionary containing the variable data and metadata
    """
    with nc.Dataset(filepath, 'r') as ncfile:
        if variable_name not in ncfile.variables:
            raise ValueError(f"Variable '{variable_name}' not found in the NetCDF file")
        
        variable = ncfile.variables[variable_name]
        
        # Check if the variable has too many data points to return directly
        # For large datasets, we'll need to downsample or use a different approach
        total_size = np.prod(variable.shape)
        
        # Get variable attributes
        attributes = {}
        for attr_name in variable.ncattrs():
            attr_value = variable.getncattr(attr_name)
            # Convert numpy types to native Python types for JSON serialization
            if isinstance(attr_value, np.ndarray):
                attr_value = attr_value.tolist()
            elif isinstance(attr_value, (np.integer, np.floating)):
                attr_value = attr_value.item()
            attributes[attr_name] = attr_value
        
        # For very large datasets, take a slice or downsample
        if total_size > 1_000_000:  # Limit to ~1 million points
            # Check if it has a time dimension
            if 'time' in variable.dimensions:
                time_index = variable.dimensions.index('time')
                
                # Take just one time slice
                slice_indices = [slice(None)] * len(variable.dimensions)
                slice_indices[time_index] = 0  # First time slice
                
                # Get the data slice
                data = variable[tuple(slice_indices)].tolist()
                
                return {
                    'data': data,
                    'dimensions': variable.dimensions,
                    'shape': variable.shape,
                    'attributes': attributes,
                    'note': 'Large dataset: Showing only first time slice'
                }
            else:
                # For other large datasets, downsample
                downsample_factor = int(np.ceil(total_size / 1_000_000))
                
                # Create downsampling slice
                slice_indices = tuple(slice(None, None, downsample_factor) for _ in range(len(variable.shape)))
                
                # Get downsampled data
                data = variable[slice_indices].tolist()
                
                return {
                    'data': data,
                    'dimensions': variable.dimensions,
                    'shape': variable.shape,
                    'attributes': attributes,
                    'note': f'Large dataset: Downsampled by factor of {downsample_factor}'
                }
        else:
            # For smaller datasets, return all data
            data = variable[:].tolist()
            
            return {
                'data': data,
                'dimensions': variable.dimensions,
                'shape': variable.shape,
                'attributes': attributes
            }

@app.route('/api/cleanup', methods=['POST'])
def cleanup_file():
    filename = request.json.get('filename')
    
    if not