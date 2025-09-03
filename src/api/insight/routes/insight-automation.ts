export default {
  routes: [
    {
      method: 'GET',
      path: '/insights/automation/triggers',
      handler: 'insight-automation.getTriggersStatus',
      config: {
        auth: { scope: ['authenticated'] },
        policies: [],
        middlewares: []
      }
    },
    {
      method: 'PUT',
      path: '/insights/automation/triggers/:triggerId/toggle',
      handler: 'insight-automation.toggleTrigger',
      config: {
        auth: { scope: ['authenticated'] },
        policies: [],
        middlewares: []
      }
    },
    {
      method: 'POST',
      path: '/insights/automation/triggers/:triggerId/execute',
      handler: 'insight-automation.executeTrigger',
      config: {
        auth: { scope: ['authenticated'] },
        policies: [],
        middlewares: []
      }
    },
    {
      method: 'GET',
      path: '/insights/automation/stats',
      handler: 'insight-automation.getAutomationStats',
      config: {
        auth: { scope: ['authenticated'] },
        policies: [],
        middlewares: []
      }
    }
  ]
};


