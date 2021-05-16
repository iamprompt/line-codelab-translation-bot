const admin = require('firebase-admin')
admin.initializeApp()
const functions = require('firebase-functions')
const axios = require('axios')

require('dotenv').config()
const LINE_ACCESS_TOKEN = process.env.LINE_ACCESS_TOKEN || ''

exports.chathook = functions
  .region('asia-northeast1')
  .https.onRequest(async (req, res) => {
    console.log(JSON.stringify(req.body))
    let event = req.body.events[0]
    if (event.message.type === 'text') {
      let inputText = event.message.text
      let groupId = event.source.groupId
      await admin
        .firestore()
        .collection('translations')
        .doc(groupId)
        .set({
          input: inputText,
          timestamp: event.timestamp,
          replyToken: event.replyToken,
        })
        .then(function () {
          console.log('Document successfully written!')
        })
        .catch(function (error) {
          console.error('Error writing document: ', error)
        })
    }
    return res.status(200).send(req.method)
  })

exports.LineBotPush = functions
  .region('asia-northeast1')
  .firestore.document('translations/{groupId}')
  .onWrite(async (change, context) => {
    let latest = change.after.data()
    let input = latest.input
    let containsJapanese = input.match(
      /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf]/,
    )
    if (containsJapanese) {
      push(context.params.groupId, `🇹🇭 ${latest.translated.th}`)
    } else {
      push(context.params.groupId, `🇯🇵 ${latest.translated.ja}`)
    }
  })

const LINE_PUSH_API = 'https://api.line.me/v2/bot/message/push'
const LINE_HEADER = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${LINE_ACCESS_TOKEN}`,
}

const push = (groupId, msg) => {
  return axios({
    method: 'post',
    url: LINE_PUSH_API,
    headers: LINE_HEADER,
    data: JSON.stringify({
      to: groupId,
      messages: [
        // { type: 'text', text: msg },
        {
          sender: {
            name: 'วุ้นแปลภาษา',
          },
          type: 'flex',
          altText: 'มีข้อความมาใหม่!!',
          contents: {
            type: 'bubble',
            body: {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'text',
                  text: msg,
                  wrap: true,
                },
              ],
            },
          },
        },
      ],
    }),
  })
}
