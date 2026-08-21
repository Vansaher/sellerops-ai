from PIL import Image

PLATFORM_CROPS = {
    "shopee": (1, 1),  # square listing image
    "tiktok": (9, 16),  # vertical Reel/Shorts-style
    "instagram": (4, 5),  # IG feed portrait
}


def crop_for_platform(source_path: str, platform: str, dest_path: str) -> None:
    """Center-crops the source image to the platform's real target aspect
    ratio and saves it as a JPEG at dest_path. No AI — deterministic image
    transformation.
    """
    ratio_w, ratio_h = PLATFORM_CROPS.get(platform, PLATFORM_CROPS["shopee"])
    target_ratio = ratio_w / ratio_h

    with Image.open(source_path) as img:
        img = img.convert("RGB")
        w, h = img.size
        if w / h > target_ratio:
            new_w = int(h * target_ratio)
            left = (w - new_w) // 2
            img = img.crop((left, 0, left + new_w, h))
        else:
            new_h = int(w / target_ratio)
            top = (h - new_h) // 2
            img = img.crop((0, top, w, top + new_h))
        img.save(dest_path, "JPEG", quality=88)
