const {createProxyMiddleware} = require('http-proxy-middleware')
 
module.exports = function(app) {
  app.use(
    createProxyMiddleware('/api', {  //api1是需要转发的请求(所有带有/api1前缀的请求都会转发给5000)
      target: 'http://127.0.0.1:3000/api/v1', //配置转发目标地址(能返回数据的服务器地址)
      changeOrigin: true, //控制服务器接收到的请求头中host字段的值
      pathRewrite: {'^/api': ''} //去除请求前缀，保证交给后台服务器的是正常请求地址(必须配置)
    })
  )
}