# Local stand-in for AWS S3

This folder mimics the future media bucket.

```
s3://digitus-forum-media/videos/{videoId}.gif
```

Today the same object key is served from the frontend static server:

```
Frontend/buckets/digitus-forum-media/videos/{videoId}.gif
```

The `video.gif` field stores the object key (`buckets/digitus-forum-media/videos/{id}.gif`).
When S3 is wired, keep the key and point the app at the bucket URL instead of `../`.
