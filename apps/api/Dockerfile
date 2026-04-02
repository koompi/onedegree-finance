FROM node:20-alpine
WORKDIR /app
RUN npm install --production pg exceljs pdfkit
COPY dist/server.js ./server.js
EXPOSE 3001
ENV NODE_ENV=production
CMD ["node", "server.js"]
