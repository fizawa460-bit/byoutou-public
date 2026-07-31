extends Node3D

@onready var world: Node = $World
@onready var info_label: Label = $HUD/Info
@onready var warnings_label: Label = $HUD/Warnings
var _build_reported := false

func _ready() -> void:
    info_label.text = "Loading JSON map..."
    world.build_finished.connect(_on_build_finished)
    world.build_progress.connect(_on_build_progress)
    # The parent owns startup so Web builds cannot emit build_finished before
    # this script has connected its handlers.
    world.call_deferred("start_build")
    get_tree().create_timer(8.0).timeout.connect(_on_build_timeout)

func _on_build_progress(stage: String) -> void:
    info_label.text = stage

func _on_build_finished(map_name: String, warnings: PackedStringArray, generated_count: int) -> void:
    _build_reported = true
    if generated_count <= 0:
        info_label.text = "ERROR: JSON loaded, but no 3D objects were generated."
    else:
        info_label.text = "Map: %s  |  Objects: %d" % [map_name, generated_count]
        info_label.text += "\nLeft stick: move  |  Swipe right side: look"
    warnings_label.text = "\n".join(warnings)

func _on_build_timeout() -> void:
    if not _build_reported:
        var stopped_stage := info_label.text
        info_label.text = "ERROR: 3D map generation did not finish."
        warnings_label.text = "Stopped during: %s" % stopped_stage
