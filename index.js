/**
 * File: index.js
 * Project: z-wechat-third
 * FilePath: /index.js
 * CreatedAt: 2021-02-26 09:27:57
 * Author: Zz
 * -----
 * LastModifiedAt: 2021-02-26 09:27:57
 * ModifiedBy: Zz
 * -----
 * Description:
 */
const https = require('https');
const xml2js = require('xml2js');
const wxcrypto = require('./lib/wxcrypto');

const parser = new xml2js.Parser({
  explicitArray: false
})

class WechatThird {

  /**
   * 根据appid和appsecret以及相应参数创建Wxthird的构造函数
   *
   * @param {String} appid 在开放平台申请得到的第三方平台appid
   * @param {String} appsecret 在开放平台申请得到的第三方平台appsecret
   * @param {String} aesToken 公众号消息校验Token
   * @param {String} aesKey 公众号消息加解密Key
   * 以下function类型的参数意在兼容使用者的多种数据持久化方案，可以放到redis或database中，但要确定全局唯一
   * @param {Function param {String}} [setVerifyTicket] 保存全局component_verify_ticket的方法，建议存放在缓存中
   * @param {Function return {String}} getVerifyTicket 获取全局component_verify_ticket的方法，必填项
   * @param {Function param {Object}} [setToken] 保存全局component_access_token的方法。 saveToken参数：{componentAccessToken:'', expiresIn: 0, createdAt: 1614237200 }
   * @param {Function return {Object}} getToken 获取全局component_access_token的方法，必填项。 getToken返回值：{componentAccessToken:'', expiresIn: 0, createdAt: 1614237200}
   *
   * @constructor
   */
  constructor({
    appid,
    appsecret,
    aesToken,
    aesKey,
    setVerifyTicket,
    getVerifyTicket,
    setToken,
    getToken,
  }) {
    this.appid = appid;
    this.appsecret = appsecret;
    this.aesToken = aesToken;
    this.aesKey = aesKey;
    this.setVerifyTicket = setVerifyTicket;
    this.getVerifyTicket = getVerifyTicket;
    this.setToken = setToken;
    this.getToken = getToken;
    this.newCrypto = new wxcrypto(this.aesToken, this.aesKey, this.appid);
  }

  async wxCallback(appid, body) {
    const bodyJson = await parser.parseStringPromise(body);
    const encryptXml = this.newCrypto.decrypt(bodyJson.xml.Encrypt).message;
    const encryptJson = await parser.parseStringPromise(encryptXml)

    const { xml } = encryptJson;
    const { ToUserName, FromUserName, MsgType, Content, Event } = xml;
    const timeStamp = parseInt(new Date().getTime()/1000);
    const nonce = 'srtgs';

    switch(MsgType) {
      case 'event': {
        // 全网发布接入检测: 事件消息
        const returnContent = Event + "from_callback";

        let sb = '';
        sb += "<xml>";
        sb += "<ToUserName><![CDATA["+FromUserName+"]]></ToUserName>";
        sb += "<FromUserName><![CDATA["+ToUserName+"]]></FromUserName>";
        sb += "<CreateTime>"+timeStamp+"</CreateTime>";
        sb += "<MsgType><![CDATA[text]]></MsgType>";
        sb += "<Content><![CDATA["+returnContent+"]]></Content>";
        sb += "</xml>";

        const encrypt = this.newCrypto.encrypt(sb);
        const signature = this.newCrypto.getSignature(timeStamp,nonce,encrypt);
        const resdata = "<xml>\n" + "<Encrypt><![CDATA["+encrypt+"]]></Encrypt>\n"
            + "<MsgSignature><![CDATA["+signature+"]]></MsgSignature>\n"
            + "<TimeStamp>"+timeStamp+"</TimeStamp>\n" + "<Nonce><![CDATA["+nonce+"]]></Nonce>\n" + "</xml>";
        return resdata;
      }
      case 'text': {
        // 全网发布接入检测: 文本消息
        const content = Content;
        if("TESTCOMPONENT_MSG_TYPE_TEXT" == content){
          const returnContent = content+"_callback";

          let sb = '';
          sb += "<xml>";
          sb += "<ToUserName><![CDATA["+FromUserName+"]]></ToUserName>";
          sb += "<FromUserName><![CDATA["+ToUserName+"]]></FromUserName>";
          sb += "<CreateTime>"+timeStamp+"</CreateTime>";
          sb += "<MsgType><![CDATA[text]]></MsgType>";
          sb += "<Content><![CDATA["+returnContent+"]]></Content>";
          sb += "</xml>";
          const encrypt = this.newCrypto.encrypt(sb);
          const signature = this.newCrypto.getSignature(timeStamp,nonce,encrypt);
          const resdata = "<xml>\n" + "<Encrypt><![CDATA["+encrypt+"]]></Encrypt>\n"
              + "<MsgSignature><![CDATA["+signature+"]]></MsgSignature>\n"
              + "<TimeStamp>"+timeStamp+"</TimeStamp>\n" + "<Nonce><![CDATA["+nonce+"]]></Nonce>\n" + "</xml>";
          return resdata;
        } else if (content.substring(0, 15) == "QUERY_AUTH_CODE") {
          // 接下来客服API再回复一次消息
          var auth_code = content.split(':')[1];

            var token = await this.getToken();
            var jsonRes = await new Promise(function (resolve, reject) {
              var data = JSON.stringify({
                component_appid: this.appid,
                authorization_code: auth_code
              });
              var options = {
                hostname: 'api.weixin.qq.com',
                path: "/cgi-bin/component/api_query_auth?component_access_token="+token,
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json; encoding=utf-8',
                  'Content-Length': Buffer.byteLength(data)
                }
              };

              var req = https.request(options, function (res) {
                console.log('STATUS: ' + res.statusCode);
                console.log('HEADERS: ' + JSON.stringify(res.headers));
                res.setEncoding('utf8');
                res.on('data', function (chunk) {
                  resolve(JSON.parse(chunk));
                });
              });
              req.on('error', function (e) {
                console.log('problem with request: ' + e.message);
                reject(new Error('http failed'));
              });
              req.write(data);
              req.end();
            });

            var msg = auth_code + "_from_api";

            var data = JSON.stringify({
              'touser': fromUserName,
              'msgtype': 'text',
              'text': {'content': msg}
            });
            var options = {
              hostname: 'api.weixin.qq.com',
              path: "/cgi-bin/message/custom/send?access_token="+jsonRes.authorization_info.authorizer_access_token,
              method: 'POST',
              headers: {
                'Content-Type': 'application/json; encoding=utf-8',
                'Content-Length': Buffer.byteLength(data)
              }
            };

            var req = https.request(options, function (res) {
              console.log('STATUS: ' + res.statusCode);
              console.log('HEADERS: ' + JSON.stringify(res.headers));
              res.setEncoding('utf8');
              res.on('data', function (chunk) {
                console.log('BODY: ' + chunk);
              });
            });
            req.on('error', function (e) {
              console.log('problem with request: ' + e.message);
            });
            req.write(data);
            req.end();
            return '';
        }
      }
      default: return ''
    }
  }
}


module.exports = WechatThird