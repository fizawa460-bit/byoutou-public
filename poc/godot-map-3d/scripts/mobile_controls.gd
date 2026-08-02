extends Control

# Dynamic joystick behavior is based on the interaction model used by
# MarcoFazioRandom/Virtual-Joystick-Godot (MIT): one captured touch ID,
# a dead zone, a clamped tip, and a complete reset on release.
@export var stick_radius := 78.0
@export var dead_zone := 12.0
@export var knob_radius := 30.0
@export var look_sensitivity := 0.0032

var _move_touch := -1
var _look_touch := -1
var _move_origin := Vector2.ZERO
var _move_position := Vector2.ZERO
var _move_vector := Vector2.ZERO
var _look_last := Vector2.ZERO
var _look_delta := Vector2.ZERO
var _touch_enabled := false
var inspection_mode := false
var _move_input_reported := false
var _look_input_reported := false

func _ready() -> void:
    _touch_enabled = DisplayServer.is_touchscreen_available() or OS.has_feature("mobile") or OS.has_feature("web")
    visible = _touch_enabled
    mouse_filter = Control.MOUSE_FILTER_IGNORE
    set_process_input(_touch_enabled)
    queue_redraw()

func _notification(what: int) -> void:
    if what == NOTIFICATION_APPLICATION_FOCUS_OUT:
        _reset_touches()

func _reset_move() -> void:
    _move_touch = -1
    _move_position = _move_origin
    _move_vector = Vector2.ZERO

func _reset_touches() -> void:
    _reset_move()
    _look_touch = -1
    _look_delta = Vector2.ZERO
    queue_redraw()

func set_inspection_mode(enabled: bool) -> void:
    inspection_mode = enabled
    _reset_touches()

func get_move_vector() -> Vector2:
    return _move_vector

func consume_look_delta() -> Vector2:
    var value := _look_delta
    _look_delta = Vector2.ZERO
    return value

func _update_move(position: Vector2) -> void:
    var offset := position - _move_origin
    var clamped := offset.limit_length(stick_radius)
    _move_position = _move_origin + clamped

    var distance := clamped.length()
    if distance <= dead_zone:
        _move_vector = Vector2.ZERO
    else:
        var usable_radius := maxf(stick_radius - dead_zone, 1.0)
        _move_vector = clamped.normalized() * ((distance - dead_zone) / usable_radius)
        _move_vector = _move_vector.limit_length(1.0)

    if not _move_input_reported and _move_vector.length() > 0.1:
        _move_input_reported = true
        print("MOBILE_MOVE_INPUT_DETECTED")

func _input(event: InputEvent) -> void:
    if not _touch_enabled or inspection_mode:
        return

    var viewport_size := get_viewport_rect().size
    if event is InputEventScreenTouch:
        if event.pressed:
            if event.position.x < viewport_size.x * 0.5 and _move_touch < 0:
                # Dynamic mode: capture exactly one left-side finger and place
                # the joystick base directly under that thumb.
                _move_touch = event.index
                _move_origin = event.position
                _move_position = event.position
                _move_vector = Vector2.ZERO
            elif event.position.x >= viewport_size.x * 0.5 and _look_touch < 0:
                _look_touch = event.index
                _look_last = event.position
        else:
            if event.index == _move_touch:
                _reset_move()
            if event.index == _look_touch:
                _look_touch = -1
        queue_redraw()
    elif event is InputEventScreenDrag:
        if event.index == _move_touch:
            _update_move(event.position)
            queue_redraw()
        elif event.index == _look_touch:
            var delta: Vector2 = event.position - _look_last
            _look_delta += delta
            _look_last = event.position
            if not _look_input_reported and delta.length() > 1.0:
                _look_input_reported = true
                print("MOBILE_LOOK_INPUT_DETECTED")

func _draw() -> void:
    if not _touch_enabled or inspection_mode:
        return

    if _move_touch >= 0:
        draw_circle(_move_origin, stick_radius, Color(0.08, 0.09, 0.11, 0.40))
        draw_arc(_move_origin, stick_radius, 0.0, TAU, 48, Color(0.9, 0.9, 0.86, 0.58), 3.0)
        draw_circle(_move_origin, dead_zone, Color(0.9, 0.9, 0.86, 0.10))
        draw_circle(_move_position, knob_radius, Color(0.85, 0.85, 0.8, 0.52))
