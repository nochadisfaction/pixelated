#!/usr/bin/env python3
import argparse
import json
import os
from http.server import BaseHTTPRequestHandler, HTTPServer, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

# Use correct import based on the available package
try:
    from mem0 import MemoryClient
except ImportError:
    try:
        from mem0ai import MemoryClient
    except ImportError:
        raise ImportError(
            "Neither mem0 nor mem0ai package is installed. Please install one with pip."
        ) from None

# Load API key from environment variable
api_key = os.getenv("MEM0_API_KEY")
if not api_key:
    raise EnvironmentError(
        "MEM0_API_KEY environment variable not set. Please set it before running the server."
    )

# Default user ID for memory operations.
# Set the DEFAULT_USER_ID environment variable to override the default ("CHAD864").
# This is used when no user_id is provided in requests.
default_user_id = os.getenv("DEFAULT_USER_ID", "CHAD864")

# Initialize the client
client = MemoryClient(api_key=api_key)


class MCPRequestHandler(BaseHTTPRequestHandler):
    def _set_response(self, status_code=200, content_type="application/json"):
        self.send_response(status_code)
        self.send_header("Content-Type", content_type)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header(
            "Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE"
        )
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_OPTIONS(self):
        self._set_response()

    def do_GET(self):
        parsed_path = urlparse(self.path)

        # Handle memory retrieval endpoints
        if parsed_path.path.startswith("/memory/"):
            memory_id = parsed_path.path.split("/")[-1]
            try:
                memory = client.get(memory_id=memory_id)
                self._set_response()
                self.wfile.write(json.dumps({"data": memory}).encode())
            except Exception as e:
                self._set_response(404)
                self.wfile.write(
                    json.dumps({"error": f"Error getting memory: {str(e)}"}).encode()
                )
            return

        # Handle memory search endpoint
        if parsed_path.path == "/search":
            query_params = parse_qs(parsed_path.query)
            query = query_params.get("q", [""])[0]
            user_id = query_params.get("user_id", [default_user_id])[0]
            limit = int(query_params.get("limit", [10])[0])

            try:
                results = client.search(query=query, user_id=user_id, limit=limit)
                self._set_response()
                self.wfile.write(json.dumps({"data": results}).encode())
            except Exception as e:
                self._set_response(500)
                self.wfile.write(
                    json.dumps({"error": f"Error searching memory: {str(e)}"}).encode()
                )
            return

        # Default response for unknown endpoints
        self._set_response(404)
        self.wfile.write(json.dumps({"error": "Endpoint not found"}).encode())

    def do_POST(self):
        content_length = int(self.headers["Content-Length"])
        post_data = self.rfile.read(content_length)

        try:
            data = json.loads(post_data.decode())
        except json.JSONDecodeError:
            self._set_response(400)
            self.wfile.write(json.dumps({"error": "Invalid JSON"}).encode())
            return

        # Handle memory creation endpoint
        if self.path == "/memory":
            try:
                self._extracted_from_do_POST_15(data)
            except Exception as e:
                self._set_response(500)
                self.wfile.write(
                    json.dumps({"error": f"Error adding memory: {str(e)}"}).encode()
                )
            return

        # Default response for unknown endpoints
        self._set_response(404)
        self.wfile.write(json.dumps({"error": "Endpoint not found"}).encode())

    # TODO Rename this here and in `do_POST`
    def _extracted_from_do_POST_15(self, data):
        messages = data.get("messages", [])
        user_id = data.get("user_id", default_user_id)
        metadata = data.get("metadata")

        response = client.add(messages=messages, user_id=user_id, metadata=metadata)

        self._set_response(201)  # Created
        self.wfile.write(json.dumps({"data": response}).encode())

    def do_DELETE(self):
        parsed_path = urlparse(self.path)

        # Handle memory deletion endpoint
        if parsed_path.path.startswith("/memory/"):
            memory_id = parsed_path.path.split("/")[-1]
            try:
                response = client.delete(memory_id=memory_id)
                self._set_response()
                self.wfile.write(json.dumps({"data": response}).encode())
            except Exception as e:
                self._set_response(500)
                self.wfile.write(
                    json.dumps({"error": f"Error deleting memory: {str(e)}"}).encode()
                )
            return

        # Default response for unknown endpoints
        self._set_response(404)
        self.wfile.write(json.dumps({"error": "Endpoint not found"}).encode())


def run_server(host="localhost", port=8000):
    server_address = (host, port)
    httpd = ThreadingHTTPServer(server_address, MCPRequestHandler)
    print(f"Starting MCP server at http://{host}:{port}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("Server stopped by user")
        httpd.server_close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Run a Model Context Protocol server for mem0"
    )
    parser.add_argument(
        "--host", default="localhost", help="Host to bind the server to"
    )
    parser.add_argument(
        "--port", type=int, default=8000, help="Port to bind the server to"
    )

    args = parser.parse_args()
    run_server(args.host, args.port)
