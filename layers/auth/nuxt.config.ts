export default defineNuxtConfig({
  "runtimeConfig": {
    "sessionSecret": "",
    "cookieDomain": "",
    "sessionCookie": "sid",
    "auth": {
      "sessionCookie": "sid",
      "sessionSecret": "",
      "cookieDomain": "",
      "sessionDuration": 604800,
      "refreshInterval": 720000,
      "appPaths": [
        "/"
      ],
      "cookie": {
        "httpOnly": true,
        "secure": true,
        "sameSite": "lax",
        "path": "/",
        "maxAge": 604800,
        "legacyCookieNames": [
          "token",
          "sessionId",
          "refreshToken",
          "surreal_access",
          "surreal_refresh"
        ]
      },
      "redirectOnFail": "/login",
      "redirectOnSuccess": "/dashboard",
      "guard": {
        "enabled": true,
        "refresh": true,
        "protect": [
          "*"
        ],
        "ignorePaths": [
          "/login",
          "/register"
        ],
        "redirectOnFail": "/login",
        "redirectOnSuccess": "/dashboard",
        "redirectOnLogout": "/",
        "testPageEnabled": false,
        "redirectAliases": {}
      }
    },
    "public": {
      "sessionCookie": "sid",
      "cookieDomain": "",
      "auth": {
        "sessionCookie": "sid",
        "cookieDomain": ""
      }
    }
  }
})
