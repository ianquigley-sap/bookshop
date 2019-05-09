exports.handler = async (event, context) => {
    return {
      statusCode: 200,
      body: '{"@odata.context":"$metadata#Authors","@odata.metadataEtag":"W/\"RcF07THJp5aOwufXCQWQTVDG5Ow8wVuVuKPYLd9dK2Y=\"","value":[{"ID":101,"firstName":"Emily","lastName":"Brontë"},{"ID":107,"firstName":"Charlotte","lastName":"Brontë"},{"ID":150,"firstName":"Edgar Allen","lastName":"Poe"},{"ID":170,"firstName":"Richard","lastName":"Carpenter"}]}'
    };
  };