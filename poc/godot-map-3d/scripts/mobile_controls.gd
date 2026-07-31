extends Control

@export var stick_radius := 72.0
@export var look_sensitivity := 0.0032

var _move_touch := -1
var _look_touch := -1
var _move_origin := Vector2.ZERO
var _move_position := Vector2.ZERO
var _look_last := Vector2.ZERO
var _look_delta := Vector2.ZERO
var _touch_enabled := false

func _ready() -> void:
    _touch_enabled = DisplayServer.is_touchscreen_available() or OS.has_feature("mobile")
    visible = _touch_enabled
    mouse_filter = Control.MOUSE_FILTER_IGNORE
    set_process_input(_touch_enabled)
    queue_redraw()

func get_move_vector() -> Vector2:
    if _move_touch < 0:
        return Vector2.ZERO
    return ((_move_position - _move_origin) / stick_radius).limit_length(1.0)

func consume_look_delta() -> Vector2:
    var value := _look_delta
    _look_delta = Vector2.ZERO
    return value

func _input(event: InputEvent) -> void:
    if not _touch_enabled:
        return
    if event is InputEventScreenTouch:
        if event.pressed:
            if event.position.x < size.x * 0.5 and _move_touch < 0:
                _move_touch = event.index
                _move_origin = event.position
                _move_position = event.position
            elif _look_touch < 0:
                _look_touch = event.index
                _look_last = event.position
        else:
            if event.index == _move_touch:
                _move_touch = -1
            if event.index == _look_touch:
                _look_touch = -1
        queue_redraw()
    elif event is InputEventScreenDrag:
        if event.index == _move_touch:
            _move_position = _move_origin + (event.position - _move_origin).limit_length(stick_radius)
            queue_redraw()
        elif event.index == _look_touch:
            _look_delta += event.position - _look_last
            _look_last = event.position

func _draw() -> void:
    if not _touch_enabled:
        return
    var hint_center := Vector2(min(115.0, size.x * 0.22), size.y - 115.0)
    var base := _move_origin if _move_touch >= 0 else hint_center
    var knob := _move_position if _move_touch >= 0 else hint_center
    draw_circle(base, stick_radius, Color(0.08, 0.09, 0.11, 0.38))
    draw_arc(base, stick_radius, 0.0, TAU, 48, Color(0.9, 0.9, 0.86, 0.55), 3.0)
    draw_circle(knob, 30.0, Color(0.85, 0.85, 0.8, 0.48))
    draw_string(ThemeDB.fallback_font, Vector2(size.x - 180.0, size.y - 42.0), "Swipe right side: look", HORIZONTAL_ALIGNMENT_LEFT, -1, 17, Color(0.9, 0.9, 0.86, 0.62))
