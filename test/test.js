/**
 * File: test.js
 * Project: z-wechat-third
 * FilePath: /test/test.js
 * CreatedAt: 2021-02-26 10:02:16
 * Author: Zz
 * -----
 * LastModifiedAt: 2021-02-26 10:02:17
 * ModifiedBy: Zz
 * -----
 * Description:
 */
const WxThird = require('../index')

const sEncodingAesKey = "abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG";
const sToken = "spamtest";
const sAppid = "wx2c2769f8efd9abc2";    

//decrypt
const sMsgSignature = "003fee52ecc56afb46c00b5c7721be87860ce785";
const sTimestamp = "1410349438";
const sNonce = "298025754";
const sEncryptBase64 = "mfBCs65c67CeJw22u4VT2TD73q5H06+ocrAIxswCaeZ/d/Lw"
                        "0msSZFHY0teqgSYiI1zR2gD2DKrB3TIrmX/liNSDrGqS8jSI/"
                        "WPeKB5VPr7Ezr7gomZAyGCwJSgT1TRFWPfONGJMxuj2nk4faTu"
                        "spAuVIFQ6SHwZuJBZC7mcJp7Cgr9cUhATQWDbOPaE7ukZBTV2Yq"
                        "yzH+UI2AK+J1S47cE79k1RX8t0hcTz/O0hlK8DGXKnvYv88qKQcI"
                        "7z4iaajqHfRVZKBNyOODabs+It+ZfM3dWTeFcPgDbGtIEnpt/EDtu"
                        "uA/zMvtkaKdHdswPnVZQ+xdwbYr3ldGvfT8HlEYEgkgKaThxTFobVl"
                        "wzu2ZkXCjicbP3xdr15Iq48ObgzPpqYuZ3IEoyggZDKClquk0u0orMck4GTF/XyE8yGzc4=";

const sPostData= "<xml><ToUserName><![CDATA[toUser]]></ToUserName><Encrypt><![CDATA[" 
            + sEncryptBase64
            + "]]></Encrypt></xml>";

const wx = new WxThird({
  appid: sAppid,
  appsecret: 'test',
  aesToken: sToken,
  aesKey: sEncodingAesKey,

})

wx.wxCallback(sAppid, sPostData).then(ret => {
  console.log(ret)
}).catch(err => {
  console.log(err)
})