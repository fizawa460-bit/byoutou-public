extends Node3D

signal build_finished(map_name: String, warnings: PackedStringArray, generated_count: int)
signal build_progress(stage: String)

@export_file("*.json") var map_json_path := "res://maps/hard_room_v1.json"
@export var cell_meters := 1.0
@export var wall_height := 2.7
@export var preview_hour := 12.0

var warnings := PackedStringArray()
var materials: Dictionary = {}
var generated_count := 0
var _current_placement: Dictionary = {}

func start_build() -> void:
    build_progress.emit("Preparing materials...")
    _make_materials()
    build_progress.emit("Loading JSON...")
    var map := _load_map(map_json_path)
    if map.is_empty():
        build_finished.emit("load failed", warnings, generated_count)
        return
    build_progress.emit("Generating 3D map...")
    _build_map(map)
    build_finished.emit(str(map.get("name", "unnamed")), warnings, generated_count)

func _load_map(path: String) -> Dictionary:
    if not FileAccess.file_exists(path):
        warnings.append("JSONが見つかりません: %s" % path)
        return {}
    var parsed = JSON.parse_string(FileAccess.get_file_as_string(path))
    if typeof(parsed) != TYPE_DICTIONARY:
        warnings.append("JSONのルートがオブジェクトではありません")
        return {}
    if not parsed.has("placements"):
        warnings.append("placements がありません")
        return {}
    return parsed

func _build_map(map: Dictionary) -> void:
    var width := int(map.get("width", 0))
    var height := int(map.get("height", 0))
    if width <= 0 or height <= 0:
        warnings.append("width / height が不正です")
        return
    _add_ceiling(width, height)
    var placements: Array = map.get("placements", [])
    for raw in placements:
        if typeof(raw) != TYPE_DICTIONARY:
            continue
        _build_placement(raw)
    _add_environment_lights(width, height)

func _build_placement(p: Dictionary) -> void:
    var tile := str(p.get("tile", ""))
    var x := float(p.get("x", 0))
    var y := float(p.get("y", 0))
    var size := _placement_size(p, tile)
    var rotation := float(p.get("rotation", 0))
    _current_placement = p.duplicate(true)
    match tile:
        "floor", "floorDark": _floor(x, y, size.x, size.y, tile == "floorDark")
        "wallTop", "wallSide": _wall(tile, x, y, size.x, size.y, rotation)
        "door", "doorSmall": _door(x, y, size.x, size.y, rotation)
        "window": _window(x, y, size.x, size.y, rotation)
        "peekWindow": _peek_window_placeholder(x, y, size.x, size.y, rotation)
        "bars": _bars(x, y, size.x, size.y, rotation)
        "curtain": _curtain(x, y, size.x, size.y, rotation)
        "futon": _futon(x, y, size.x, size.y)
        "table": _table(x, y, size.x, size.y, rotation)
        "partition", "cabinet": _furniture(tile, x, y, size.x, size.y, rotation)
        "toiletSinkCombo": _toilet_sink_combo(x, y, size.x, size.y, rotation)
        "toilet", "sink": _legacy_fixture(tile, x, y, size.x, size.y, rotation)
        "toiletPaperDispenser": _toilet_paper_dispenser(x, y, rotation)
        "rail": _rail(x, y, size.x, size.y, rotation, false)
        "railEdge": _rail(x, y, size.x, size.y, rotation, true)
        "mealHatchClosed", "mealHatchOpen": _meal_hatch(x, y, rotation)
        "grime", "shadow", "mealTray": pass
        _:
            var message := "未対応タイル: %s" % tile
            if not warnings.has(message): warnings.append(message)

func _placement_size(p: Dictionary, tile: String) -> Vector2:
    var defaults := {
        "door": Vector2(2, 1), "window": Vector2(9, 1), "curtain": Vector2(9, 1),
        "bars": Vector2(3, 1), "futon": Vector2(2, 3), "table": Vector2(1, 2),
        "partition": Vector2(1, 2), "toiletSinkCombo": Vector2(1, 2),
        "rail": Vector2(3, 1), "railEdge": Vector2(3, 1)
    }
    var fallback: Vector2 = defaults.get(tile, Vector2.ONE)
    return Vector2(float(p.get("width", fallback.x)), float(p.get("height", fallback.y)))

func _center(x: float, y: float, w: float, h: float, elevation := 0.0) -> Vector3:
    return Vector3((x + w * 0.5) * cell_meters, elevation, (y + h * 0.5) * cell_meters)

func _box(name: String, position: Vector3, size: Vector3, material: Material, collision := false, rotation_y := 0.0) -> StaticBody3D:
    generated_count += 1
    var body := StaticBody3D.new()
    body.name = name
    body.position = position
    body.rotation.y = rotation_y
    body.collision_layer = 3 if collision else 2
    body.collision_mask = 0
    body.set_meta("tile", str(_current_placement.get("tile", name)))
    body.set_meta("part", name)
    body.set_meta("map_x", float(_current_placement.get("x", 0)))
    body.set_meta("map_y", float(_current_placement.get("y", 0)))
    body.set_meta("map_width", float(_current_placement.get("width", 1)))
    body.set_meta("map_height", float(_current_placement.get("height", 1)))
    body.set_meta("map_rotation", float(_current_placement.get("rotation", 0)))
    var mesh_instance := MeshInstance3D.new()
    var mesh := BoxMesh.new()
    mesh.size = size
    mesh.material = material
    mesh_instance.mesh = mesh
    body.add_child(mesh_instance)
    # Every generated part is ray-pickable on layer 2 for inspection mode.
    # Only parts marked collision=true also occupy player collision layer 1.
    var shape_node := CollisionShape3D.new()
    var shape := BoxShape3D.new()
    shape.size = size
    shape_node.shape = shape
    body.add_child(shape_node)
    add_child(body)
    return body

func _cylinder(name: String, position: Vector3, size: Vector3, material: Material, rotation_y := 0.0, top_radius_ratio := 1.0) -> StaticBody3D:
    generated_count += 1
    var body := StaticBody3D.new()
    body.name = name
    body.position = position
    body.rotation.y = rotation_y
    body.collision_layer = 2
    body.collision_mask = 0
    body.set_meta("tile", str(_current_placement.get("tile", name)))
    body.set_meta("part", name)
    body.set_meta("map_x", float(_current_placement.get("x", 0)))
    body.set_meta("map_y", float(_current_placement.get("y", 0)))
    body.set_meta("map_width", float(_current_placement.get("width", 1)))
    body.set_meta("map_height", float(_current_placement.get("height", 1)))
    body.set_meta("map_rotation", float(_current_placement.get("rotation", 0)))
    var mesh_instance := MeshInstance3D.new()
    var mesh := CylinderMesh.new()
    mesh.height = size.y
    mesh.bottom_radius = size.x * 0.5
    mesh.top_radius = size.x * 0.5 * top_radius_ratio
    mesh.radial_segments = 20
    mesh.material = material
    mesh_instance.mesh = mesh
    mesh_instance.scale.z = size.z / size.x
    body.add_child(mesh_instance)
    var shape_node := CollisionShape3D.new()
    var shape := CylinderShape3D.new()
    shape.height = size.y
    shape.radius = maxf(size.x, size.z) * 0.5
    shape_node.shape = shape
    body.add_child(shape_node)
    add_child(body)
    return body

func _floor(x: float, y: float, w: float, h: float, dark: bool) -> void:
    # Keep a narrow seam so JSON placement boundaries remain visible in 3D.
    var seam := 0.025
    var size := Vector3(maxf(0.05, w * cell_meters - seam), 0.12, maxf(0.05, h * cell_meters - seam))
    _box("Floor", _center(x, y, w, h, -0.06), size, materials.dark_floor if dark else materials.floor, true)

func _wall(tile: String, x: float, y: float, w: float, h: float, rotation: float) -> void:
    var size := Vector3(w * cell_meters, wall_height, 0.16)
    if tile == "wallSide": size = Vector3(0.16, wall_height, h * cell_meters)
    _box("Wall", _center(x, y, w, h, wall_height * 0.5), size, materials.wall, true, deg_to_rad(rotation))

func _span(w: float, h: float) -> float:
    return maxf(w, h) * cell_meters

func _rotated_offset(rotation: float, local_offset: Vector3) -> Vector3:
    return local_offset.rotated(Vector3.UP, deg_to_rad(rotation))

func _door(x: float, y: float, w: float, h: float, rotation: float) -> void:
    _box("Door", _center(x, y, w, h, 1.125), Vector3(_span(w, h) * 0.92, 2.25, 0.12), materials.door, true, deg_to_rad(rotation))

func _window(x: float, y: float, w: float, h: float, rotation: float) -> void:
    var span := _span(w, h)
    var pos := _center(x, y, w, h, 1.55)
    _box("WindowGlass", pos, Vector3(span, 1.25, 0.04), materials.glass, false, deg_to_rad(rotation))
    _box("WindowSill", pos + Vector3(0, -0.72, 0), Vector3(span, 0.12, 0.18), materials.metal, true, deg_to_rad(rotation))

func _peek_window_placeholder(x: float, y: float, w: float, h: float, rotation: float) -> void:
    # The existing peekWindow artwork was being mistaken for a full-height glass panel.
    # Keep only a small frame marker until the dedicated 3D hatch is authored.
    var center := _center(x, y, w, h, 1.45)
    _box("PeekWindowFrameTop", center + Vector3(0, 0.24, 0), Vector3(0.58, 0.05, 0.12), materials.metal, false, deg_to_rad(rotation))
    _box("PeekWindowFrameBottom", center + Vector3(0, -0.24, 0), Vector3(0.58, 0.05, 0.12), materials.metal, false, deg_to_rad(rotation))

func _bars(x: float, y: float, w: float, h: float, rotation: float) -> void:
    var span := _span(w, h)
    var center := _center(x, y, w, h, wall_height * 0.5)
    # In this map, a one-cell "bars" placement is the glazed end panel beside
    # the iron bars. It is glass only, not glass layered over another iron grid.
    if w <= 1.0 and h <= 1.0:
        # The glazed end panel is a solid boundary. Its bottom 20 cm is an
        # ordinary wall, with collision glass filling the space above it.
        var base_height := 0.20
        var glass_height := wall_height - base_height
        var panel_width := span * 0.88
        _box("BarsEndWallBase", _center(x, y, w, h, base_height * 0.5), Vector3(panel_width, base_height, 0.16), materials.wall, true, deg_to_rad(rotation))
        _box("BarsEndGlass", _center(x, y, w, h, base_height + glass_height * 0.5), Vector3(panel_width, glass_height, 0.04), materials.glass, true, deg_to_rad(rotation))
        return
    var count: int = maxi(2, int(span / 0.28))
    for i in range(count + 1):
        var offset: float = -span * 0.5 + span * float(i) / float(count)
        var pos := center + _rotated_offset(rotation, Vector3(offset, 0, 0))
        _box("Bar", pos, Vector3(0.045, wall_height, 0.06), materials.metal, true, deg_to_rad(rotation))
    for level in [0.45, 1.35, 2.25]:
        var pos := Vector3(center.x, level, center.z)
        _box("BarCross", pos, Vector3(span, 0.045, 0.07), materials.metal, true, deg_to_rad(rotation))

func _curtain(x: float, y: float, w: float, h: float, rotation: float) -> void:
    _box("Curtain", _center(x, y, w, h, 1.6), Vector3(_span(w, h), 1.55, 0.025), materials.curtain, false, deg_to_rad(rotation))

func _futon(x: float, y: float, w: float, h: float) -> void:
    # The futon is visual-only: the player may walk across it.
    _box("Futon", _center(x, y, w, h, 0.09), Vector3(w * cell_meters * 0.82, 0.18, h * cell_meters * 0.86), materials.fabric, false)

func _table(x: float, y: float, w: float, h: float, rotation: float) -> void:
    # The editor already stores the rotated occupied bounds in width/height.
    # Applying rotation again turns a horizontal 3x1 table back into a vertical one.
    var table_width := w * cell_meters * 0.86
    var table_depth := h * cell_meters * 0.72
    var center := _center(x, y, w, h)
    # A 90-degree table in this map sits against the wall on the positive Z
    # side. The wall mesh is centred in the next cell, so move the table beyond
    # its occupied-cell centre while leaving a small visible clearance.
    if is_equal_approx(fposmod(rotation, 360.0), 90.0):
        center.z += 0.48 * cell_meters
    _box("MealTableTop", center + Vector3(0, 0.73, 0), Vector3(table_width, 0.10, table_depth), materials.furniture, true)
    for local_x in [-table_width * 0.38, table_width * 0.38]:
        var leg_pos := center + Vector3(local_x, 0.36, 0)
        _box("MealTableLeg", leg_pos, Vector3(0.10, 0.72, table_depth * 0.72), materials.furniture, true)
    print("TABLE_BUILD_ORIENTATION width=%.2f depth=%.2f json_rotation=%.1f" % [table_width, table_depth, rotation])

func _furniture(tile: String, x: float, y: float, w: float, h: float, rotation: float) -> void:
    var height := 0.78
    if tile == "partition": height = 1.45
    if tile == "cabinet": height = 1.1
    var size := Vector3(w * cell_meters * 0.72, height, h * cell_meters * 0.72)
    var center := _center(x, y, w, h, height * 0.5)
    # The toilet partition spans y=11..13 and is authored against the wall on
    # its positive Z side. Match the table wall offset instead of leaving the
    # shrunken furniture mesh floating near the occupied-cell centre.
    if tile == "partition" and is_equal_approx(fposmod(rotation, 360.0), 0.0):
        center.z += 0.48 * cell_meters
    _box(tile, center, size, materials.furniture, true, deg_to_rad(rotation))

func _toilet_sink_combo(x: float, y: float, w: float, h: float, rotation: float) -> void:
    var center := _center(x, y, w, h)
    var toilet_center := center + _rotated_offset(rotation, Vector3(0, 0, 0.38))
    var sink_center := center + _rotated_offset(rotation, Vector3(0, 0, -0.43))
    # One continuous security cabinet makes the fixture read as a manufactured
    # toilet/sink unit rather than two unrelated boxes.
    _box("ComboSecurityCabinet", center + Vector3(0, 0.48, 0), Vector3(0.62, 0.96, 1.18), materials.fixture_metal, true, deg_to_rad(rotation))
    _cylinder("ComboToiletPedestal", toilet_center + Vector3(0, 0.24, 0), Vector3(0.48, 0.48, 0.58), materials.fixture_metal, deg_to_rad(rotation), 1.18)
    _cylinder("ComboToiletRim", toilet_center + Vector3(0, 0.50, 0), Vector3(0.60, 0.10, 0.72), materials.fixture_metal, deg_to_rad(rotation))
    _cylinder("ComboToiletOpening", toilet_center + Vector3(0, 0.558, 0), Vector3(0.40, 0.018, 0.50), materials.fixture_dark, deg_to_rad(rotation))
    _box("ComboSinkDeck", sink_center + Vector3(0, 0.87, 0), Vector3(0.64, 0.16, 0.58), materials.fixture_metal, false, deg_to_rad(rotation))
    _cylinder("ComboSinkBasin", sink_center + Vector3(0, 0.958, -0.02), Vector3(0.46, 0.018, 0.34), materials.fixture_dark, deg_to_rad(rotation))
    _box("ComboSplashBack", sink_center + _rotated_offset(rotation, Vector3(0, 1.08, 0.25)), Vector3(0.64, 0.36, 0.08), materials.fixture_metal, false, deg_to_rad(rotation))
    _box("ComboFaucet", sink_center + _rotated_offset(rotation, Vector3(0, 1.18, 0.04)), Vector3(0.08, 0.22, 0.08), materials.metal, false, deg_to_rad(rotation))
    _box("ComboFlushButton", toilet_center + _rotated_offset(rotation, Vector3(0, 0.78, 0.34)), Vector3(0.10, 0.10, 0.025), materials.fixture_dark, false, deg_to_rad(rotation))

func _legacy_fixture(tile: String, x: float, y: float, w: float, h: float, rotation: float) -> void:
    var center := _center(x, y, w, h)
    if tile == "toilet":
        _cylinder("LegacyToilet", center + Vector3(0, 0.32, 0), Vector3(0.54, 0.54, 0.66), materials.fixture_metal, deg_to_rad(rotation), 1.1)
        _cylinder("LegacyToiletOpening", center + Vector3(0, 0.60, 0), Vector3(0.34, 0.018, 0.44), materials.fixture_dark, deg_to_rad(rotation))
    else:
        _box("LegacySink", center + Vector3(0, 0.78, 0), Vector3(0.68, 0.18, 0.52), materials.fixture_metal, true, deg_to_rad(rotation))
        _cylinder("LegacySinkOpening", center + Vector3(0, 0.88, 0), Vector3(0.42, 0.018, 0.30), materials.fixture_dark, deg_to_rad(rotation))

func _toilet_paper_dispenser(x: float, y: float, rotation: float) -> void:
    # The JSON placement is deliberately lateral to the seated toilet, never
    # behind it. Rotation 0 mounts the plate on the room-facing side of y=13.
    var center := _center(x, y, 1, 1, 0.76) + _rotated_offset(rotation, Vector3(0, 0, -0.43))
    _box("DispenserPatientPlate", center, Vector3(0.54, 0.42, 0.045), materials.fixture_metal, false, deg_to_rad(rotation))
    _box("DispenserPaperSlot", center + _rotated_offset(rotation, Vector3(0, -0.04, -0.028)), Vector3(0.34, 0.065, 0.018), materials.fixture_dark, false, deg_to_rad(rotation))
    _box("DispenserPaperTail", center + _rotated_offset(rotation, Vector3(0, -0.15, -0.043)), Vector3(0.27, 0.18, 0.008), materials.paper, false, deg_to_rad(rotation))

func _rail(x: float, y: float, w: float, h: float, rotation: float, edge_aligned: bool) -> void:
    # Rails are authored along local X and rotated once. railEdge is shifted to the
    # requested cell edge instead of being placed through the cell centre.
    var center := _center(x, y, w, h, 0.012)
    if edge_aligned:
        # JSON rotation describes the visible/front edge in 2D screen
        # coordinates. Convert that direction explicitly instead of using
        # Godot's opposite-sign 3D yaw convention for the edge offset.
        var angle := deg_to_rad(rotation)
        var edge_direction := Vector3(sin(angle), 0, -cos(angle))
        center += edge_direction * minf(w, h) * cell_meters * 0.46
    _box("FloorRailEdge" if edge_aligned else "FloorRail", center, Vector3(_span(w, h), 0.024, 0.055), materials.rail_white, false, deg_to_rad(rotation))

func _meal_hatch(x: float, y: float, rotation: float) -> void:
    # Offset toward the room so the wall no longer hides the serving hatch.
    var center := _center(x, y, 1, 1, 1.08) + _rotated_offset(rotation, Vector3(0, 0, -0.11))
    _box("MealHatchFrame", center, Vector3(0.68, 0.44, 0.07), materials.metal, false, deg_to_rad(rotation))
    _box("MealHatchDoor", center + _rotated_offset(rotation, Vector3(0, 0, -0.025)), Vector3(0.58, 0.34, 0.035), materials.door, false, deg_to_rad(rotation))

func _add_ceiling(width: int, height: int) -> void:
    _box("Ceiling", Vector3(width * cell_meters * 0.5, wall_height, height * cell_meters * 0.5), Vector3(width * cell_meters, 0.08, height * cell_meters), materials.ceiling, false)

func _add_environment_lights(width: int, height: int) -> void:
    var environment := WorldEnvironment.new()
    var env := Environment.new()
    env.background_mode = Environment.BG_COLOR
    env.background_color = Color("101217")
    env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
    env.ambient_light_color = Color("b8c0c5")
    env.ambient_light_energy = 0.65
    environment.environment = env
    add_child(environment)
    var artificial := OmniLight3D.new()
    artificial.position = Vector3(width * 0.5 * cell_meters, 2.35, height * 0.58 * cell_meters)
    artificial.light_color = Color("fff1d2")
    artificial.light_energy = 7.0
    artificial.omni_range = maxf(float(width), float(height)) * 0.62 * cell_meters
    artificial.shadow_enabled = true
    add_child(artificial)
    var sun := DirectionalLight3D.new()
    sun.rotation_degrees = Vector3(-38.0, _sun_yaw(preview_hour), 0.0)
    sun.light_color = Color("fff0c0") if preview_hour < 16.0 else Color("ff9b55")
    sun.light_energy = 1.3
    sun.shadow_enabled = true
    add_child(sun)
    warnings.append("Sunlight uses PoC defaults because time/intensity are not stored in JSON.")

func _sun_yaw(hour: float) -> float:
    return lerpf(-55.0, 55.0, clampf((hour - 7.0) / 10.0, 0.0, 1.0))

func _make_materials() -> void:
    materials.floor = _material(Color("77736b"), 0.92)
    materials.dark_floor = _material(Color("34383a"), 0.98)
    materials.wall = _material(Color("d2d0c8"), 0.88)
    materials.ceiling = _material(Color("aaa9a3"), 0.95)
    materials.door = _material(Color("6d7778"), 0.7)
    materials.metal = _material(Color("697276"), 0.42, 0.65)
    materials.rail_white = _material(Color("e8e9e4"), 0.48, 0.15)
    materials.fixture_white = _material(Color("d9ddd9"), 0.62)
    materials.fixture_metal = _material(Color("9da4a3"), 0.32, 0.82)
    materials.fixture_dark = _material(Color("181c1d"), 0.7, 0.25)
    materials.paper = _material(Color("ddd9cd"), 0.96)
    materials.fabric = _material(Color("a59c83"), 1.0)
    materials.furniture = _material(Color("4c4134"), 0.78)
    materials.curtain = _material(Color(0.84, 0.85, 0.80, 0.82), 0.95, 0.0, true)
    materials.glass = _material(Color(0.43, 0.61, 0.68, 0.26), 0.18, 0.0, true)

func _material(color: Color, roughness: float, metallic := 0.0, transparent := false) -> StandardMaterial3D:
    var material := StandardMaterial3D.new()
    material.albedo_color = color
    material.roughness = roughness
    material.metallic = metallic
    if transparent:
        material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
        material.cull_mode = BaseMaterial3D.CULL_DISABLED
    return material
