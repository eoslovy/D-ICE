ARG FRONTEND_IMAGE
FROM ${FRONTEND_IMAGE} as frontend
FROM nginx:1.25
ARG NGINX=local_nginx.conf
ENV NGINX_CONF=${NGINX}
RUN rm -rf /usr/share/nginx/html/*

COPY --from=frontend /dist /usr/share/nginx/html

COPY ${NGINX_CONF} /etc/nginx/nginx.conf

EXPOSE 80
#
CMD ["nginx", "-g", "daemon off;"]
