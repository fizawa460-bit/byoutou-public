#!/usr/bin/env python3
"""Keep one CC0 toilet and one sink from OpenGameArt's Toilets.glb."""

import json
import copy
import struct
import sys
from pathlib import Path


def main() -> None:
    source = Path(sys.argv[1])
    target = Path(sys.argv[2])
    data = source.read_bytes()
    magic, version, total_length = struct.unpack_from("<4sII", data)
    if magic != b"glTF" or version != 2 or total_length != len(data):
        raise SystemExit("Expected a valid GLB 2.0 file")

    chunks = []
    offset = 12
    document = None
    while offset < len(data):
        length, chunk_type = struct.unpack_from("<I4s", data, offset)
        offset += 8
        payload = data[offset : offset + length]
        offset += length
        if chunk_type == b"JSON":
            document = json.loads(payload)
        chunks.append((chunk_type, payload))
    if document is None:
        raise SystemExit("GLB has no JSON chunk")

    nodes = document["nodes"]
    by_name = {node.get("name"): index for index, node in enumerate(nodes)}
    toilet = by_name["Toilet_Elongated_C"]
    sink = by_name["Sink_B"]

    # Reset the gallery-layout offsets and assemble a compact fixture. The
    # toilet faces +Z; the wall-mounted sink sits directly behind it.
    nodes[toilet]["translation"] = [0.0, 0.0, 0.18]
    nodes[sink]["translation"] = [0.0, 0.80, -0.42]

    # Godot imports every node present in the GLB, even when it is not a root
    # of the active glTF scene. Remove the nine unselected gallery fixtures
    # entirely so they can never pollute the runtime AABB.
    selected = []
    def collect(index: int) -> None:
        if index in selected:
            return
        selected.append(index)
        for child in nodes[index].get("children", []):
            collect(child)

    collect(toilet)
    collect(sink)
    remap = {old: new for new, old in enumerate(selected)}
    curated_nodes = []
    for old in selected:
        node = copy.deepcopy(nodes[old])
        if "children" in node:
            node["children"] = [remap[child] for child in node["children"]]
        curated_nodes.append(node)
    document["nodes"] = curated_nodes
    document["scenes"] = [{"name": "ToiletSinkCombo", "nodes": [remap[toilet], remap[sink]]}]
    document["scene"] = 0

    encoded_json = json.dumps(document, ensure_ascii=False, separators=(",", ":")).encode()
    encoded_json += b" " * ((4 - len(encoded_json) % 4) % 4)
    output_chunks = []
    for chunk_type, payload in chunks:
        if chunk_type == b"JSON":
            payload = encoded_json
        output_chunks.append(struct.pack("<I4s", len(payload), chunk_type) + payload)
    body = b"".join(output_chunks)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(struct.pack("<4sII", b"glTF", 2, 12 + len(body)) + body)


if __name__ == "__main__":
    main()
