FROM node:20-alpine
WORKDIR /app
RUN npm install pg
COPY dist/server.js ./server.js
EXPOSE 3001
CMD ["node", "server.js"]
