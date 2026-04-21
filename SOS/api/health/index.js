module.exports = async function (context, req) {
  context.res.status = 200;
  context.res.body = { status: 'ok', timestamp: Date.now() };
};
