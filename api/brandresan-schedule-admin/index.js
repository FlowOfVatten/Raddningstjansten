const state = require('../state');

module.exports = async function (context, req) {
  try {
    const { lessons } = req.body || {};
    
    if (!lessons || !Array.isArray(lessons)) {
      return {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
        body: { error: 'lessons array required' }
      };
    }

    const result = await state(context, {
      method: 'PUT',
      body: {
        id: 'brandresan-schedule',
        payload: lessons
      }
    });
    
    context.res = result;
  } catch (err) {
    context.log.error('brandresan-schedule-admin PUT error', err);
    context.res = {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
      body: { error: err.message }
    };
  }
};
