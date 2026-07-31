extends Node3D

@onready var world: Node = $World
@onready var player: CharacterBody3D = $Player
@onready var info_label: Label = $HUD/Info
@onready var warnings_label: Label = $HUD/Warnings
@onready var inspect_button: Button = $HUD/InspectButton
@onready var inspect_panel: PanelContainer = $HUD/InspectPanel
@onready var inspect_label: Label = $HUD/InspectPanel/Margin/VBox/Details
@onready var copy_button: Button = $HUD/InspectPanel/Margin/VBox/Copy
@onready var mobile_controls: Control = $HUD/MobileControls

var _build_reported := false
var _inspection_enabled := false
var _last_inspection_text := ""

func _ready() -> void:
    inspect_button.pressed.connect(_toggle_inspection)
    copy_button.pressed.connect(_copy_inspection)
    inspect_panel.visible = false
    info_label.text = "Connecting map builder..."
    if not world.has_signal("build_finished") or not world.has_signal("build_progress"):
        _show_startup_error("World map builder signals are unavailable.")
        return
    world.connect("build_finished", Callable(self, "_on_build_finished"))
    world.connect("build_progress", Callable(self, "_on_build_progress"))
    info_label.text = "Starting map builder..."
    if not world.has_method("start_build"):
        _show_startup_error("World map builder start method is unavailable.")
        return
    world.call_deferred("start_build")
    get_tree().create_timer(8.0).timeout.connect(_on_build_timeout)

func _input(event: InputEvent) -> void:
    if event is InputEventKey and event.pressed and event.keycode == KEY_I:
        _toggle_inspection()
        get_viewport().set_input_as_handled()
        return
    if not _inspection_enabled:
        return
    var tap_position := Vector2.ZERO
    var should_inspect := false
    if event is InputEventScreenTouch and not event.pressed:
        tap_position = event.position
        should_inspect = event.position.y > 76.0
    elif event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
        tap_position = event.position
        should_inspect = event.position.y > 76.0
    if should_inspect:
        _inspect_at(tap_position)
        get_viewport().set_input_as_handled()

func _toggle_inspection() -> void:
    _inspection_enabled = not _inspection_enabled
    inspect_button.text = "Exit Inspect" if _inspection_enabled else "Inspect"
    inspect_panel.visible = _inspection_enabled
    if _inspection_enabled:
        inspect_label.text = "Tap a 3D part to inspect its JSON source."
        warnings_label.visible = false
    else:
        warnings_label.visible = true
    if player.has_method("set_inspection_mode"):
        player.call("set_inspection_mode", _inspection_enabled)
    if mobile_controls.has_method("set_inspection_mode"):
        mobile_controls.call("set_inspection_mode", _inspection_enabled)

func _inspect_at(screen_position: Vector2) -> void:
    var camera := get_viewport().get_camera_3d()
    if camera == null:
        inspect_label.text = "Camera unavailable."
        return
    var origin := camera.project_ray_origin(screen_position)
    var destination := origin + camera.project_ray_normal(screen_position) * 100.0
    var query := PhysicsRayQueryParameters3D.create(origin, destination, 2)
    query.collide_with_bodies = true
    query.collide_with_areas = false
    var hit := get_world_3d().direct_space_state.intersect_ray(query)
    if hit.is_empty():
        inspect_label.text = "No generated part selected."
        return
    var body: Object = hit.get("collider")
    var tile := str(body.get_meta("tile", "unknown"))
    var part := str(body.get_meta("part", body.get("name")))
    var map_x := float(body.get_meta("map_x", 0))
    var map_y := float(body.get_meta("map_y", 0))
    var map_w := float(body.get_meta("map_width", 1))
    var map_h := float(body.get_meta("map_height", 1))
    var rotation := float(body.get_meta("map_rotation", 0))
    var position: Vector3 = hit.get("position", Vector3.ZERO)
    _last_inspection_text = "3D inspection: tile=%s, part=%s, JSON x=%.1f y=%.1f width=%.1f height=%.1f rotation=%.1f, hit=(%.2f, %.2f, %.2f). Please fix this object without changing the JSON." % [tile, part, map_x, map_y, map_w, map_h, rotation, position.x, position.y, position.z]
    inspect_label.text = "tile: %s   part: %s\nJSON: x %.1f / y %.1f / w %.1f / h %.1f / rotation %.1f\nTap Copy, then paste the request to ChatGPT." % [tile, part, map_x, map_y, map_w, map_h, rotation]

func _copy_inspection() -> void:
    if _last_inspection_text.is_empty():
        inspect_label.text = "Select a generated part first."
        return
    # Web clipboard access must run directly from the button's user gesture.
    # JavaScriptBridge is more reliable than DisplayServer.clipboard_set on iOS browsers.
    if OS.has_feature("web"):
        var encoded_text := JSON.stringify(_last_inspection_text)
        JavaScriptBridge.eval("navigator.clipboard.writeText(%s)" % encoded_text)
    else:
        DisplayServer.clipboard_set(_last_inspection_text)
    copy_button.text = "Copied!"
    inspect_label.text += "\nCopied. Paste it into ChatGPT."
    print("INSPECTION_COPY_REQUESTED")
    get_tree().create_timer(1.5).timeout.connect(func(): copy_button.text = "Copy request")

func _show_startup_error(message: String) -> void:
    _build_reported = true
    info_label.text = "ERROR: 3D map startup failed."
    warnings_label.text = message

func _on_build_progress(stage: String) -> void:
    info_label.text = stage

func _on_build_finished(map_name: String, warnings: PackedStringArray, generated_count: int) -> void:
    _build_reported = true
    if generated_count <= 0:
        info_label.text = "ERROR: JSON loaded, but no 3D objects were generated."
    else:
        info_label.text = "Map: %s  |  Objects: %d" % [map_name, generated_count]
        info_label.text += "\nLeft stick: move  |  Swipe right side: look  |  Inspect: select part"
    warnings_label.text = "\n".join(warnings)
    print("MAP_BUILD_SUCCESS objects=%d map=%s" % [generated_count, map_name])

func _on_build_timeout() -> void:
    if not _build_reported:
        var stopped_stage := info_label.text
        info_label.text = "ERROR: 3D map generation did not finish."
        warnings_label.text = "Stopped during: %s" % stopped_stage
