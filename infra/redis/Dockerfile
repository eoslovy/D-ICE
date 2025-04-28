FROM redis:7.2.0
#
VOLUME ["/data"]
EXPOSE 6379
HEALTHCHECK --interval=10s --timeout=5s --retries=5 \
  CMD redis-cli ping || exit 1

CMD ["redis-server"]