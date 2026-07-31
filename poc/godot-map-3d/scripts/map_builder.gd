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
    match tile:
        "floor", "floorDark": _floor(x, y, size.x, size.y, tile == "floorDark")
        "wallTop", "wallSide": _wall(tile, x, y, size.x, size.y, rotation)
        "door", "doorSmall": _door(x, y, size.x, size.y, rotation)
        "window", "peekWindow": _window(x, y, size.x, size.y, rotation)
        "bars": _bars(x, y, size.x, size.y, rotation)
        "curtain": _curtain(x, y, size.x, size.y, rotation)
        "futon": _futon(x, y, size.x, size.y)
        "table", "partition", "cabinet", "toilet", "sink": _furniture(tile, x, y, size.x, size.y, rotation)
        "rail", "railEdge": _rail(x, y, size.x, size.y, rotation)
        "mealHatchClosed", "mealHatchOpen": _meal_hatch(x, y, rotation)
        "grime", "shadow", "mealTray": pass
        _:
            var message := "未対応タイル: %s" % tile
            if not warnings.has(message): warnings.append(message)

func _placement_size(p: Dictionary, tile: String) -> Vector2:
    var defaults := {
        "door": Vector2(2, 1), "window": Vector2(9, 1), "curtain": Vector2(9, 1),
        "bars": Vector2(3, 1), "futon": Vector2(2, 3), "table": Vector2(1, 2),
        "partition": Vector2(1, 2), "rail": Vector2(3, 1), "railEdge": Vector2(3, 1)
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
    var mesh_instance := MeshInstance3D.new()
    var mesh := BoxMesh.new()
    mesh.size = size
    mesh.material = material
    mesh_instance.mesh = mesh
    body.add_child(mesh_instance)
    if collision:
        var shape_node := CollisionShape3D.new()
        var shape := BoxShape3D.new()
        shape.size = size
        shape_node.shape = shape
        body.add_child(shape_node)
    add_child(body)
    return body

func _floor(x: float, y: float, w: float, h: float, dark: bool) -> void:
    _box("Floor", _center(x, y, w, h, -0.06), Vector3(w * cell_meters, 0.12, h * cell_meters), materials.dark_floor if dark else materials.floor, true)

func _wall(tile: String, x: float, y: float, w: float, h: float, rotation: float) -> void:
    var size := Vector3(w * cell_meters, wall_height, 0.16)
    if tile == "wallSide": size = Vector3(0.16, wall_height, h * cell_meters)
    _box("Wall", _center(x, y, w, h, wall_height * 0.5), size, materials.wall, true, deg_to_rad(rotation))

func _door(x: float, y: float, w: float, h: float, rotation: float) -> void:
    var size := Vector3(w * cell_meters * 0.92, 2.25, 0.12)
    if int(rotation) % 180 == 90: size = Vector3(0.12, 2.25, h * cell_meters * 0.92)
    _box("Door", _center(x, y, w, h, 1.125), size, materials.door, true)

func _window(x: float, y: float, w: float, h: float, rotation: float) -> void:
    var horizontal := int(rotation) % 180 == 0
    var span := w * cell_meters if horizontal else h * cell_meters
    var pos := _center(x, y, w, h, 1.55)
    _box("WindowGlass", pos, Vector3(span, 1.25, 0.04) if horizontal else Vector3(0.04, 1.25, span), materials.glass, false)
    _box("WindowSill", pos + Vector3(0, -0.72, 0), Vector3(span, 0.12, 0.18) if horizontal else Vector3(0.18, 0.12, span), materials.metal, true)

func _bars(x: float, y: float, w: float, h: float, rotation: float) -> void:
    var horizontal := int(rotation) % 180 == 0
    var span := w * cell_meters if horizontal else h * cell_meters
    var count := max(2, int(span / 0.28))
    for i in range(count + 1):
        var offset := -span * 0.5 + span * float(i) / count
        var pos := _center(x, y, w, h, wall_height * 0.5)
        pos += Vector3(offset, 0, 0) if horizontal else Vector3(0, 0, offset)
        _box("Bar", pos, Vector3(0.045, wall_height, 0.06) if horizontal else Vector3(0.06, wall_height, 0.045), materials.metal, true)
    for level in [0.45, 1.35, 2.25]:
        var pos := _center(x, y, w, h, level)
        _box("BarCross", pos, Vector3(span, 0.045, 0.07) if horizontal else Vector3(0.07, 0.045, span), materials.metal, true)

func _curtain(x: float, y: float, w: float, h: float, rotation: float) -> void:
    var horizontal := int(rotation) % 180 == 0
    var pos := _center(x, y, w, h, 1.6)
    _box("Curtain", pos, Vector3(w * cell_meters, 1.55, 0.025) if horizontal else Vector3(0.025, 1.55, h * cell_meters), materials.curtain, false)

func _futon(x: float, y: float, w: float, h: float) -> void:
    _box("Futon", _center(x, y, w, h, 0.09), Vector3(w * cell_meters * 0.82, 0.18, h * cell_meters * 0.86), materials.fabric, true)

func _furniture(tile: String, x: float, y: float, w: float, h: float, rotation: float) -> void:
    var height := 0.78
    if tile == "partition": height = 1.45
    if tile == "cabinet": height = 1.1
    var size := Vector3(w * cell_meters * 0.72, height, h * cell_meters * 0.72)
    _box(tile, _center(x, y, w, h, height * 0.5), size, materials.metal if tile in ["toilet", "sink"] else materials.furniture, true, deg_to_rad(rotation))

func _rail(x: float, y: float, w: float, h: float, rotation: float) -> void:
    var horizontal := int(rotation) % 180 == 0
    var span := max(w, h) * cell_meters
    _box("Rail", _center(x, y, w, h, 1.0), Vector3(span, 0.06, 0.06) if horizontal else Vector3(0.06, 0.06, span), materials.metal, false, deg_to_rad(rotation if int(rotation) % 45 == 0 else 0))

func _meal_hatch(x: float, y: float, rotation: float) -> void:
    _box("MealHatch", _center(x, y, 1, 1, 1.05), Vector3(0.58, 0.34, 0.08), materials.metal, false, deg_to_rad(rotation))

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
    artificial.omni_range = max(width, height) * 0.62 * cell_meters
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
    return lerp(-55.0, 55.0, clamp((hour - 7.0) / 10.0, 0.0, 1.0))

func _make_materials() -> void:
    materials.floor = _material(Color("77736b"), 0.92)
    materials.dark_floor = _material(Color("34383a"), 0.98)
    materials.wall = _material(Color("d2d0c8"), 0.88)
    materials.ceiling = _material(Color("aaa9a3"), 0.95)
    materials.door = _material(Color("6d7778"), 0.7)
    materials.metal = _material(Color("697276"), 0.42, 0.65)
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
