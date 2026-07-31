extends Node3D

@onready var world: Node = $World
@onready var warnings_label: Label = $HUD/Warnings

func _ready() -> void:
    world.build_finished.connect(_on_build_finished)

func _on_build_finished(map_name: String, warnings: PackedStringArray) -> void:
    $HUD/Info.text += "\nMap: %s" % map_name
    warnings_label.text = "\n".join(warnings)

