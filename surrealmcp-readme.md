services:
  surrealmcp:
    image: surrealdb/surrealmcp:latest
    container_name: surrealmcp_711
    command: >
      start
      --bind-address 0.0.0.0:711
      --server-url http://localhost:711
      --endpoint ws://127.0.0.1:/7587rpc
      --ns mynamespace
      --db mydatabase
      --user schema
      --pass mpd1
      --auth-disabled
    ports:
      - "711:711"

# Save as: surrealmcp.compose.yml (or docker-compose.surrealmcp.711.yml)
# Then run:
docker compose -f surrealmcp.compose.yml up -d

# Check it's alive:
curl http://localhost:711/health


# Stop it:
docker compose -f surrealmcp.compose.yml down



Yes — Docker will only download the image once, and you can spin up many MCP containers that each bind to a different local port and point at a different SurrealDB endpoint/credentials.

The two key rules:
1) Each compose file (or each service) must use a unique host port (e.g. 711, 712, 713…).
2) Each MCP instance should point at exactly one endpoint (your preference), so there’s no chance of “wrong DB” accidents.

Important note about endpoints:
- If your SurrealDB is running on your Mac (not in Docker), use:
  ws://host.docker.internal:8000/rpc
- If your SurrealDB is on a remote server, use:
  ws://YOUR_SERVER:PORT/rpc

