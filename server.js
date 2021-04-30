const AWS = require('aws-sdk');
AWS.config.update( {
  region: 'us-east-1'
});
const dynamodb = new AWS.DynamoDB.DocumentClient();
const dynamodbTableName = 'proyecto';
const metodoPath = '/metodosproyecto';

exports.handler = async function(event) {
  console.log('Request event: ', event);
  let response;
  switch(true) {
    case event.httpMethod === 'GET' && event.path === metodoPath:
      response = await getInfo();
      break;
    case event.httpMethod === 'POST' && event.path === metodoPath:
      response = await saveInfo(JSON.parse(event.body));
      break;
    case event.httpMethod === 'PUT' && event.path === metodoPath:
      const requestBody = JSON.parse(event.body);
      response = await modifyInfo(requestBody.sensorDataId, requestBody.updateKey, requestBody.updateValue);
      break;
    case event.httpMethod === 'DELETE' && event.path === metodoPath:
      response = await deleteInfo(JSON.parse(event.body).sensorDataId);
      break;
    default:
      response = buildResponse(404, '404 Not Found');
  }
  return response;
}
async function getInfo() {
  const params = {
    TableName: dynamodbTableName
  }
  const allInfo = await scanDynamoRecords(params, []);
  const body = {
    Info: allInfo
  }
  return buildResponse(200, body);
}

async function scanDynamoRecords(scanParams, itemArray) {
  try {
    const dynamoData = await dynamodb.scan(scanParams).promise();
    itemArray = itemArray.concat(dynamoData.Items);
    if (dynamoData.LastEvaluatedKey) {
      scanParams.ExclusiveStartkey = dynamoData.LastEvaluatedKey;
      return await scanDynamoRecords(scanParams, itemArray);
    }
    return itemArray;
  } catch(error) {
    console.error('No hay coincidencia ', error);
  }
}





async function saveInfo(requestBody) {
  const params = {
    TableName: dynamodbTableName,
    Item: requestBody
  }
  return await dynamodb.put(params).promise().then(() => {
    const body = {
      Metodo: 'PUSH',
      Mensaje: 'ReGISTRADO',
      Item: requestBody
    }
    return buildResponse(200, body);
  }, (error) => {
    console.error('No hay Coincidencias: ', error);
  })
}

async function modifyInfo(sensorDataId, updateKey, updateValue) {
  const params = {
    TableName: dynamodbTableName,
    Key: {
      'sensorDataId': sensorDataId
    },
    UpdateExpression: `set ${updateKey} = :value`,
    ExpressionAttributeValues: {
      ':value': updateValue
    },
    ReturnValues: 'UPDATED_NEW'
  }
  return await dynamodb.update(params).promise().then((response) => {
    const body = {
      Metodo: 'UPDATE',
      Mensaje: 'Modificado',
      UpdatedAttributes: response
    }
    return buildResponse(200, body);
  }, (error) => {
    console.error('No hay coincidencias ', error);
  })
}

async function deleteInfo(sensorDataId) {
  const params = {
    TableName: dynamodbTableName,
    Key: {
      'sensorDataId': sensorDataId
    },
    ReturnValues: 'ALL_OLD'
  }
  return await dynamodb.delete(params).promise().then((response) => {
    const body = {
      Metodo: 'DELETE',
      Mensaje: 'Eliminado',
      Item: response
    }
    return buildResponse(200, body);
  }, (error) => {
    console.error('No hay coincidencias ', error);
  })
}

function buildResponse(statusCode, body) {
  return {
    statusCode: statusCode,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  }
}