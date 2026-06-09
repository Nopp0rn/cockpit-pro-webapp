import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default async function handler(req, res) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 14);

    const result = await cloudinary.search
      .expression("folder=cockpit_sure")
      .max_results(500)
      .execute();

    let deleted = 0;

    for (const resource of result.resources) {
      const created = new Date(resource.created_at);

      if (created < cutoffDate) {
        await cloudinary.uploader.destroy(resource.public_id, {
          resource_type: "video",
        });

        deleted++;
      }
    }

    return res.status(200).json({
      success: true,
      deleted,
      message: `Deleted ${deleted} old videos`
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
