# Lineage

Every asset records: stable ID, relative path, media type, checksum,
dimensions/duration, source type (imported/generated/extracted/derived),
parent assets, entity/scene/shot associations, reference roles, and status.

Generated files additionally record: generation packet ID, renderer/model,
workflow adapter + version/hash, seed/settings, prompt compiler + version,
input asset IDs, and backend job ID.

Never rely on filenames for lineage. (Spec section 10.)
