import { Component, computed, input } from '@angular/core';

export type IconName =
    | 'alert'
    | 'arrow-right'
    | 'calc'
    | 'camera'
    | 'close'
    | 'instagram'
    | 'itemized'
    | 'link'
    | 'menu'
    | 'moon'
    | 'network'
    | 'payment'
    | 'percent'
    | 'sun'
    | 'tag'
    | 'tiktok'
    | 'x';

@Component({
    selector: 'app-icon',
    template: '',
    styleUrl: './icon.component.scss',
    host: {
        'aria-hidden': 'true',
        '[style.--icon]': 'url()',
        '[style.color]': 'color()'
    }
})
export class IconComponent {
    readonly name = input.required<IconName>();
    readonly color = input<string>();
    protected readonly url = computed(
        () => `url(images/icons/${this.name()}.svg)`
    );
}
