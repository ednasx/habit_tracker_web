FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# For dev: Vite dev server
ENV VITE_API_BASE_URL=http://localhost:8080/api
EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
