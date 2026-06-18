from ten_runtime import (  # type: ignore
    Addon,
    TenEnv,
    register_addon_as_extension,
)


@register_addon_as_extension("senvoice_tts_python")
class SenvoiceTTSExtensionAddon(Addon):
    def on_create_instance(self, ten_env: TenEnv, name: str, context) -> None:
        from .extension import SenvoiceTTSExtension

        ten_env.log_info("SenvoiceTTSExtensionAddon on_create_instance")
        ten_env.on_create_instance_done(SenvoiceTTSExtension(name), context)
