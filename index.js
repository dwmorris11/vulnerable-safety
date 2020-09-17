const express = require('express');
const morgan = require('morgan');
const path = require('path');
const axios = require('axios');
const Redis = require('ioredis');
const parser = require('body-parser');
const accountSid = 'ACc66c938293c460438da57ac9eeb69e40';
const authToken = 'b3b358b8d44d851d197ac750b08a3dc4';
const client = require('twilio')(accountSid, authToken);
let smsMessage = {
  body: 'This is the ship that made the Kessel Run in fourteen parsecs?',
  from: '+14793162670',
  to: '+13605350865'
};

const redis = new Redis(6380);
redis.on('connect', () => {
  console.log('connected to Redis');
})

const app = express();
const port = 3001;
const retentionTime = 600000;
const threshold = 80;

app.use(morgan('dev'));
app.use(parser.json());

app.post('/temperature', (req, res) => {
  redis.call("TS.ADD","temperature", req.body.time, req.body.temperature, `RETENTION ${retentionTime}`,'LABELS', 'id', req.body.id)
    .then((response) => {
      if(req.body.temperature > threshold) {
        redis.call("TS.INCRBY", "alarm", 1, req.body.time, `RETENTION ${retentionTime}`, 'LABELS', 'id',
        req.body.id)
        .then((r) => r)
        .catch(err => console.log(err));
      }
      res.status(200).send()
    })
    .catch((err) => {
      console.log('Temperature database insert error.', err.message);
      res.status(500).send(err);
    });
});

app.post('/child', (req, res) => {
  redis.call("TS.ADD","child", req.body.time, req.body.status, `RETENTION ${retentionTime}`,'LABELS', 'id', req.body.id)
    .then((response) => res.status(200).send())
    .catch((err) => {
      console.log('Child database insert error.', err.message);
      res.status(500).send(err);
    });
});

app.post('/car', (req, res) => {
  redis.call("TS.ADD","car", req.body.time, req.body.status, `RETENTION ${retentionTime}`,'LABELS', 'id', req.body.id)
    .then((response) => (
      res.status(200).send()))
    .catch((err) => {
      console.log('Car database insert error.', err.message);
      res.status(500).send(err);
    });
});

app.get('/temperature/:past/:time', (req, res) => {
  let past = req.params.past;
  let time = req.params.time;
  redis.call("TS.RANGE", "temperature", past, time, 100)
    .then((response) => {
      let temperatures = [];
      for(let i = 0; i < response.length; i++) {
        temperatures.push(Number(response[i][1]));
      };
      res.status(200).send(temperatures);
    })
    .catch((err) => {
      console.log(err.message);
      res.status(500).send(err);
    });
});

app.get('/child', (req, res) => {
  redis.call("TS.GET", "child")
    .then((response) => {
      res.status(200).send(response);
    })
    .catch((err) => {
      console.log(err.message);
      res.status(500).send(err);
    });
});

app.get('/car', (req, res) => {
  redis.call("TS.GET", "car")
    .then((response) => {
      res.status(200).send(response);
    })
    .catch((err) => {
      console.log(err.message);
      res.status(500).send(err);
    });
});

let previousCount = 0;
let newCount = 0;
app.get('/alarms', (req, res) => {
  redis.call("TS.GET", "alarm")
    .then((response) => {
      newCount = response[1];
      if(newCount - previousCount > 10) {
        smsMessage.body = `Alarms have exceed ${newCount}`;
        client.messages
          .create(smsMessage)
          .then(message => console.log(message.sid))
          .catch(err => console.log(err));
        previousCount = newCount;
      }
      res.status(200).send(response);

    })
    .catch((err) => {
      console.log(err);
      res.status(500).send(err);
    });
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});


client.messages
  .create(smsMessage)
  .then(message => console.log(message.sid))
  .catch(err => console.log(err));