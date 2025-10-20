FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ENV NODE_ENV=production
EXPOSE 5000
# If your package.json has "start": "node server.js" or similar
CMD ["npm", "run", "start"]
