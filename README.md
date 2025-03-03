# ADTCapsHome DVR HTTP Proxy
## Requirements
Container method recommended.

### Container
- Internet connection.
- Docker or podman, etc.

### Direct execution
- Internet connection.
- Node 23 or later.
- FFmpeg with rtsp over tcp support.

## Endpoints
### GET /health
- Returns 204.

### /:device_id/stream
#### Parameters
- :device_id
  
  DVR Device ID.

#### Query Parameters
- token
  
  API token for upstream API authentication.

#### Returns
- 200

  Returns `video/mp2t` raw video live stream. Normally H264 (1920x1080), AAC.
- 400

  Malformed request.
- 401

  Failed to authenticate.
- 404

  Authenticated successfully but device not found.
- 500

  Unknown upstream failures.
- 502

  Stream request failed or other upstream failures.
