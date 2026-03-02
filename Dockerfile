FROM node:20-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY dist/ ./dist/
COPY aliases.json server.json ./
ENTRYPOINT ["node", "dist/index.js"]
