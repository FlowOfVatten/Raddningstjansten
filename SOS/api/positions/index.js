const { firefighters } = require('../shared/storage');

module.exports = async function (context, req) {
  context.res.headers['Content-Type'] = 'application/json';
  context.res.headers['Access-Control-Allow-Origin'] = '*';

  const positions = Array.from(firefighters.values());
  
  context.res.status = 200;
  context.res.body = {
    timestamp: Date.now(),
    firefighters: positions,
    count: positions.length
  };
};
