from ten_runtime import Addon, TenEnv, register_addon_as_extension


@register_addon_as_extension("local_time_tool_python")
class LocalTimeToolExtensionAddon(Addon):
    def on_create_instance(self, ten_env: TenEnv, name: str, context) -> None:
        from .extension import LocalTimeToolExtension

        ten_env.log_info("LocalTimeToolExtensionAddon on_create_instance")
        ten_env.on_create_instance_done(LocalTimeToolExtension(name), context)
