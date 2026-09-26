import React, { useRef } from 'react';

function FileUpload({ onUploaded, onError }) {
  const inputRef = useRef(null);

  const handleUpload = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const resp = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const json = await resp.json();
      if (!json.success) throw new Error(json.error);
      onUploaded(json);
    } catch (e) {
      onError(e.message);
    }
  };

  return (
    <div className="upload-panel">
      <p>Upload a NetCDF file (.nc) to inspect its variables and grid.</p>
      <input
        ref={inputRef}
        type="file"
        accept=".nc,.nc4,.cdf,.netcdf"
        onChange={(e) => {
          const file = e.target.files[0];
          if (file) handleUpload(file);
        }}
      />
      <button onClick={() => inputRef.current.click()}>Choose File</button>
    </div>
  );
}

export default FileUpload;
