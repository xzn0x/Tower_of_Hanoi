#!/usr/bin/env python3
import os
import webbrowser

def main():
    # Construct the path to the HTML GUI file
    html_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'gui', 'index.html')
    
    if not os.path.exists(html_file):
        print(f"Error: GUI file not found at {html_file}")
        return
        
    url = f"file://{html_file}"
    print("="*40)
    print("Starting Tower of Hanoi GUI")
    print("="*40)
    print(f"Opening browser to: {url}")
    
    # Open the browser
    webbrowser.open(url)

if __name__ == "__main__":
    main()
