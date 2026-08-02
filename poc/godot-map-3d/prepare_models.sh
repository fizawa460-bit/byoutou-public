#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source_zip="$project_dir/assets/source_models/toilet_sink/toilet_sink_source.zip"
target_dir="$project_dir/assets/models/toilet_sink"
blend_path="$target_dir/toilet_sink.blend"
glb_path="$target_dir/toilet_sink.glb"

mkdir -p "$target_dir"
unzip -p "$source_zip" toilet4bs.blend > "$blend_path"
TOILET_SINK_GLB="$glb_path" blender --background "$blend_path" --python-expr 'import bpy, os; bpy.ops.export_scene.gltf(filepath=os.environ["TOILET_SINK_GLB"], export_format="GLB", export_apply=True)'
test -s "$glb_path"
rm -f "$blend_path"
