## 主要功能

加速友链页面的头像加载．

## 工作方式

假如说一个头像的 URL 是：

```
https://somedomain.com/avatar.png
```

那么我们首先将它进行编码，具体编码方式是：

```
encodeURIComponent(`https://somedomain.com/avatar.png`)
```

得到

```
https%3A%2F%2Fsomedomain.com%2Favatar.png
```

然后将它作为参数传给本项目提供的 API: 

```
/api/avatar?link=https%3A%2F%2Fsomedomain.com%2Favatar.png
```

本 API 就会返回一个 `image/webp` 类型的数据，可以将它作为头像使用．

为什么这样可以加速呢？

首先可以将它部署在 Vercel 上，利用 Vercel 提供的 HTTP2 服务和全球 CDN 服务来实现加速；

其次我们默认将输出的图片的大小设为 60 乘 60, 格式为 WebP，所以体积更小，自然加载速度也就更快．

## 部署方式

### 自有部署

首先克隆到部署环境，然后：

```
cd webimagecache
npm i
npm run build
npm run start
```

即可．

### Vercel 部署

Fork 一份本项目，或者克隆后上传至自己的仓库，然后打开 Vercel 官网，新建项目，按照提示操作即可．
