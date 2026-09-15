FROM node:18-alpine

RUN mkdir -p /usr/src/node-app && chown -R node:node /usr/src/node-app

WORKDIR /usr/src/node-app

COPY package.json package-lock.json ./

USER node

RUN npm ci --omit=dev

COPY --chown=node:node . .

EXPOSE 8000

# Run the app directly rather than via PM2 - Railway (like most container
# platforms) already handles process supervision/restarts itself, and PM2's
# cluster mode was swallowing the app's own log output inside the container.
CMD ["node", "src/index.js"]
