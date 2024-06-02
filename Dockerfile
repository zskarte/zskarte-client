FROM node:20-alpine as build

# Create app directory
WORKDIR /app

# yarn install
ADD ./package.json ./yarn.lock /app/
RUN yarn install --frozen-lockfile

# Copy all files
ADD . /app

# yarn build
ARG CONFIG=swerder
RUN NODE_ENV=production yarn run ng build --configuration ${CONFIG}

#use multistage build to server static result
FROM nginx:stable-alpine as run
LABEL org.opencontainers.image.source=https://github.com/swerder/zskarte-client
LABEL org.opencontainers.image.description="Zivilschutz Karte V3 Client fork by swerder"
LABEL org.opencontainers.image.licenses=MIT

#adjust default conf
COPY nginx_default.conf /etc/nginx/conf.d/default.conf

# Copy all static files from build stage
COPY --from=build /app/dist/zskarte-v3/ /usr/share/nginx/html/
