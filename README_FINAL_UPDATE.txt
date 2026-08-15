FINAL UPDATE

Public pages (except admin.html) include a top-left language selector. Language preference is stored in a one-year cookie. Payment-method selection submits a pending payment_request to JSONBin. Gift-card photos are submitted to the JSONBin bucket named gift_photos.

Production note: base64 images can exceed JSONBin record limits. For production, object storage is preferable; JSONBin should store the resulting image URL.
