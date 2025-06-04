#!/usr/bin/env python3
"""Convert Python script with cell markers to Jupyter notebook"""

import json
import re

def convert_to_notebook(python_file, notebook_file):
    """Convert Python script to Jupyter notebook"""
    
    with open(python_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    cells = []
    current_cell = {'cell_type': 'code', 'source': [], 'metadata': {}}
    
    lines = content.split('\n')
    i = 0
    
    while i < len(lines):
        line = lines[i]
        
        if line.startswith('# %% [markdown]'):
            # Save current cell if it has content
            if current_cell['source']:
                if current_cell['cell_type'] == 'code':
                    current_cell['execution_count'] = None
                    current_cell['outputs'] = []
                cells.append(current_cell)
            
            # Start new markdown cell
            current_cell = {'cell_type': 'markdown', 'source': [], 'metadata': {}}
            i += 1
            continue
            
        elif line.startswith('# %%'):
            # Save current cell if it has content
            if current_cell['source']:
                if current_cell['cell_type'] == 'code':
                    current_cell['execution_count'] = None
                    current_cell['outputs'] = []
                cells.append(current_cell)
            
            # Start new code cell
            current_cell = {'cell_type': 'code', 'source': [], 'metadata': {}}
            i += 1
            continue
            
        else:
            # Add line to current cell
            if current_cell['cell_type'] == 'markdown' and line.startswith('# '):
                # Remove leading # from markdown
                current_cell['source'].append(line[2:])
            else:
                current_cell['source'].append(line)
        
        i += 1
    
    # Add the last cell
    if current_cell['source']:
        if current_cell['cell_type'] == 'code':
            current_cell['execution_count'] = None
            current_cell['outputs'] = []
        cells.append(current_cell)
    
    # Clean up empty cells and join source lines
    cleaned_cells = []
    for cell in cells:
        if cell['source']:
            # Join source lines with newlines
            cell['source'] = '\n'.join(cell['source'])
            cleaned_cells.append(cell)
    
    # Create notebook structure
    notebook = {
        'cells': cleaned_cells,
        'metadata': {
            'kernelspec': {
                'display_name': 'Python 3',
                'language': 'python',
                'name': 'python3'
            },
            'language_info': {
                'codemirror_mode': {'name': 'ipython', 'version': 3},
                'file_extension': '.py',
                'mimetype': 'text/x-python',
                'name': 'python',
                'nbconvert_exporter': 'python',
                'pygments_lexer': 'ipython3',
                'version': '3.8.5'
            }
        },
        'nbformat': 4,
        'nbformat_minor': 4
    }
    
    # Save as notebook
    with open(notebook_file, 'w', encoding='utf-8') as f:
        json.dump(notebook, f, indent=2, ensure_ascii=False)
    
    print(f'✅ Notebook created: {notebook_file}')

if __name__ == '__main__':
    convert_to_notebook('youtube_transcription_notebook.py', 'YouTube_Transcription_Pipeline.ipynb') 