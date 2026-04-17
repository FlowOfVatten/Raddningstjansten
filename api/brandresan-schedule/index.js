const state = require('../state');

module.exports = async function (context, req) {
  try {
    const result = await state(context, {
      method: 'GET',
      query: { id: 'brandresan-schedule' }
    });
    
    context.res = result;
  } catch (err) {
    context.log.error('brandresan-schedule GET error', err);
    context.res = {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
      body: { error: err.message }
    };
  }
};
