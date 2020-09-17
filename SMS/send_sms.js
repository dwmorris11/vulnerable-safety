
const accountSid = '';
const authToken = '';
const client = require('twilio')(accountSid, authToken);

let smsMessage = {
  body: 'This is the ship that made the Kessel Run in fourteen parsecs?',
  from: '+14793162670',
  to: '+13605350865'
};
client.messages
  .create(smsMessage)
  .then(message => console.log(message.sid))
  .catch(err => console.log(err));

