FROM node:22-alpine

# Create app directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --production

# Copy source code
COPY . .

# Set environment and port
ENV PORT=4001
EXPOSE 4001

# Start the server
CMD ["npm", "start"]
