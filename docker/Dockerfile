# Use an official Node.js runtime as a parent image
FROM node:14

RUN apt-get update && apt-get install -y \
    netcat \
    && rm -rf /var/lib/apt/lists/*
# Set the working directory
WORKDIR /usr/src/app

# Copy the package.json and package-lock.json files
COPY package*.json ./

# Install the dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
