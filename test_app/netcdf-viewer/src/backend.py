# app.py
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import netCDF4 as nc
import numpy as np
import os
import tempfile
import uuid
import json
from generic_handler import GenericNetCDFHandler

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
            # Use the GenericNetCDFHandler for smart coordinate detection
            handler = GenericNetCDFHandler(filepath)
            result = handler.describe()
            handler.close()
            
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
    time_idx = request.args.get('time', default=0, type=int)
    level_idx = request.args.get('level', default=0, type=int)
    
    if not filename or not variable:
        return jsonify({'error': 'Missing filename or variable parameter'}), 400
    
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    
    if not os.path.exists(filepath):
        return jsonify({'error': 'File not found'}), 404
    
    try:
        handler = GenericNetCDFHandler(filepath)
        data = handler.get_variable_data(variable, time_idx=time_idx, level_idx=level_idx)
        handler.close()
        
        return jsonify({
            'success': True,
            'variable': variable,
            'data': data
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/cleanup', methods=['POST'])
def cleanup_file():
    filename = request.json.get('filename')
    if not filename:
        return jsonify({'error': 'Missing filename parameter'}), 400
    
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    try:
        if os.path.exists(filepath):
            os.remove(filepath)
        return jsonify({'success': True, 'message': f'File {filename} removed'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=True)
