#!/bin/sh

# Function to check if the app is running
wait_for_app() {
  while ! nc -z app 3000; do
    echo "Waiting for app to be available..."
    sleep 2
  done
  echo "App is up and running!"
}

# Call the function to wait for the app
wait_for_app

# Start a loop to call the script every minute
while true
do
  API_BASE_URL=app npx ts-node ./src/cli.ts sync
  API_BASE_URL=app npx ts-node ./src/cli.ts delete-completed-tasks syncaudio2
  API_BASE_URL=app npx ts-node ./src/cli.ts download-transcriptions
  sleep 300 # 300 secs = 5 minutes
done

