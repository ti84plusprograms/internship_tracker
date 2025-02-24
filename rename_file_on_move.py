import os
import re
import time
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import psutil
import sys

def check_if_already_running(script_name):
    for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
        cmd_line = proc.info['cmdline']
        if cmd_line and script_name in cmd_line:
            return True
    return False

if check_if_already_running('rename_file_on_move.py'):
    print("Script is already running. Exiting.")
    sys.exit()

# Define the folder to watch
WATCH_FOLDER = "ML_Modeling_binary_email_classifier/datasets"

# Define the expected regex pattern
EXPECTED_PATTERN = re.compile(r"ML_Dataset_email_classifier_.*\.csv")

class FileRenameHandler(FileSystemEventHandler):
    def on_created(self, event):
        if not event.is_directory:
            file_path = event.src_path
            file_name = os.path.basename(file_path)

            # Check if the file matches the expected pattern
            if not EXPECTED_PATTERN.match(file_name):
                # Prompt user for input to append to filename
                user_input = input(f"Enter the string to append to the file name for {file_name}: ")
                
                # Create the new filename by appending the user input
                new_name = f"ML_Dataset_email_classifier_{user_input}.csv"
                new_path = os.path.join(WATCH_FOLDER, new_name)
                
                # Rename the file
                os.rename(file_path, new_path)
                print(f"Renamed {file_name} -> {new_name}")

# Set up the observer
observer = Observer()
event_handler = FileRenameHandler()
observer.schedule(event_handler, WATCH_FOLDER, recursive=False)
observer.start()

try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    observer.stop()
observer.join()