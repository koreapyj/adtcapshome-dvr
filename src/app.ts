import Fastify from 'fastify'
import * as child_process from 'child_process';

const streams = {
};

const fastify = Fastify({
  logger: true
})

const sleep = (ms) => {
  return new Promise((resolve, _) => {
    setTimeout(resolve, ms);
  });
};

// Declare a route
fastify.get('/health', async (request, reply) => {
  reply.statusCode = 204;
})

fastify.get('/:device_id/stream', async (request, reply) => {
  const {device_id} = request.params as {device_id: string};
  const {token} = request.query as {token: string};
  if(!device_id || !token) {
    reply.statusCode = 400;
    return;
  }
  const {user_id, cookie} = await (async () => {
    const resp = await fetch('https://adtcapshome.co.kr:8443/transaction/ADT_HOME_APP_SERVICE.HomeLoginService', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        'header': {
          'CHANNEL':'ADT_HOME_APP_SERVICE',
        },
        'body': {
          'request': {
            'login_type':'T',
            'auth_token': token,
          }
        }
      })
    })
    let cookie = resp.headers.getSetCookie()?.map(x=>(x.match(/^.*?=.*?;/) as any)[0]).join(' ');
    const resp_obj = await resp.json();
    if(resp_obj.header?.RESULT_MSG !== '정상') {
      reply.statusCode = 401;
      return {user_id: null, cookie: null};
    }

    let user_id = resp_obj.body.response.user_info.user_id as string;
    if(resp_obj.body.response.user_info.device_id != device_id) {
      reply.statusCode = 404;
      return {user_id: null, cookie: null};
    }
    return {user_id, cookie};
  })();
  if(user_id === null || cookie === null) {
    return;
  }

  if(streams[device_id]) {
    return reply.send(streams[device_id]);
  }

  /* request to start stream */ {
    const resp = await (await fetch('https://adtcapshome.co.kr:8443/transaction/ADT_HOME_APP_SERVICE.remoDoorcamService/stream_ondemand', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie,
      },
      body: JSON.stringify({
        "body": {
          "request": {
            device_id,
          }
        }
      })
    })).json();
    if(resp.body?.response?.response?.result !== 'success') {
      reply.statusCode = 502;
      return;
    }
  }
  /* request stream */while(1) {
    const resp = await (await fetch('https://adtcapshome.co.kr:8443/transaction/ADT_HOME_APP_SERVICE.remoDoorcamService/stream_start', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie,
      },
      body: JSON.stringify({
        'header': {
          'CHANNEL':'ADT_HOME_APP_SERVICE',
        },
        "body": {
          "request": {
            user_id,
            device_id,
            "os":"android",
            "live_yn":"Y"
          }
        }
      })
    })).json();
    if(resp.body.response.response.error_code === '0201') {
      await sleep(500);
      continue;
    }
    if(!resp.body.response.documents?.movie_stream) {
      reply.statusCode = 500;
      return;
    }
    if(resp.body?.response?.response?.result !== 'success') {
      reply.statusCode = 502;
      return;
    }
    reply.header('content-type', 'video/mp2t');
    reply.removeHeader('content-length');
    const ffmpeg = child_process.spawn('ffmpeg', [
      '-rtsp_transport',
      'tcp',
      '-i',
      resp.body.response.documents.movie_stream,
      '-c:v',
      'copy',
      '-c:a',
      'copy',
      '-f',
      'mpegts',
      '-'
    ]);
    request.socket.on('close', () => {
      ffmpeg.kill();
      streams[device_id] = null;
      console.log('socket closed. killing ffmpeg');
    });
    streams[device_id] = ffmpeg.stdout;

    ffmpeg.stderr.on('data', (data: Buffer) => {
      console.error(data.toString('utf8'))
    });
    break;
  }
  return reply.send(streams[device_id]);
})

// Run the server!
try {
  await fastify.listen({ port: 3000, host: process.env.BIND||'127.0.0.1' })
} catch (err) {
  fastify.log.error(err)
  process.exit(1)
}
